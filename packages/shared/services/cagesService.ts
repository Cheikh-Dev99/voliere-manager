import {
  runTransaction,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
  collection,
  deleteDoc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Transaction } from 'firebase/firestore';
import { auth } from '../firebase/authClient';
import { db } from '../firebase/config';
import { requireOwnerUid } from '../firebase/requireOwnerUid';
import { COLLECTIONS } from '../firebase/collections';
import type { Cage, CageFormData, CageOccupancyEvent, CageOccupancyKind, Pigeon, Couple } from '../types';
import { CageSchema } from '../validators/schemas';

/** Sous-collection : `cages/{cageId}/evenements` — journal d’occupation. */
export const CAGE_OCCUPANCY_EVENTS = 'evenements' as const;

function cageLabel(c: Pick<Cage, 'numero' | 'voliereCode'>): string {
  return `${c.voliereCode ?? 'A'} · ${c.numero}`;
}

function occupancyCol(cageId: string) {
  return collection(db, COLLECTIONS.CAGES, cageId, CAGE_OCCUPANCY_EVENTS);
}

const FETCH_OCC_MAX = 1000;

/**
 * Charge une page d’événements d’occupation (lecture seule), du plus récent au plus ancien.
 * Utile pour un modal « historique complet » sans multiplier les listeners temps réel.
 */
export const fetchCageOccupancyEvents = async (
  cageId: string,
  maxEntries: number = 500,
): Promise<CageOccupancyEvent[]> => {
  const cap = Math.min(Math.max(1, maxEntries), FETCH_OCC_MAX);
  const q = query(occupancyCol(cageId), orderBy('createdAt', 'desc'), limit(cap));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<CageOccupancyEvent, 'id'>),
  }));
};

type OccPayload = {
  kind: CageOccupancyKind;
  summary: string;
  pigeonId: string | null;
  coupleId: string | null;
  otherCageId: string | null;
  otherCageLabel: string | null;
  reasonCode: string | null;
  reasonDetail: string | null;
};

function txAppendOcc(tx: Transaction, cageId: string, p: OccPayload) {
  const ref = doc(occupancyCol(cageId));
  tx.set(ref, {
    ...p,
    createdAt: serverTimestamp(),
  });
}

export type LibererCageOptions = {
  reasonCode?: string | null;
  reasonDetail?: string | null;
};

export type DeplacerCageOptions = {
  reasonCode?: string | null;
  reasonDetail?: string | null;
};

/**
 * RG-CAGE-01 : Affecter un pigeon seul à une cage
 * - cage doit être LIBRE
 * - pigeon doit être ACTIF et non dans un couple actif avec cage déjà attribuée
 * - opération ATOMIQUE (transaction)
 */
export const affecterPigeonACage = async (pigeonId: string, cageId: string): Promise<void> => {
  const ownerUid = requireOwnerUid();
  const dejaCage = query(
    collection(db, COLLECTIONS.CAGES),
    where('ownerUid', '==', ownerUid),
    where('pigeonId', '==', pigeonId),
  );
  const snapCages = await getDocs(dejaCage);
  const autre = snapCages.docs.find(d => d.id !== cageId);
  if (autre) {
    throw new Error('Ce pigeon est déjà affecté à une autre cage');
  }

  const qMale = query(
    collection(db, COLLECTIONS.COUPLES),
    where('ownerUid', '==', ownerUid),
    where('statut', '==', 'ACTIF'),
    where('maleId', '==', pigeonId),
  );
  const qFem = query(
    collection(db, COLLECTIONS.COUPLES),
    where('ownerUid', '==', ownerUid),
    where('statut', '==', 'ACTIF'),
    where('femelleId', '==', pigeonId),
  );
  const [sM, sF] = await Promise.all([getDocs(qMale), getDocs(qFem)]);
  if (!sM.empty || !sF.empty) {
    throw new Error('Un pigeon déjà en couple actif ne peut pas être affecté seul à une cage');
  }

  await runTransaction(db, async (tx) => {
    const cageRef   = doc(db, COLLECTIONS.CAGES,   cageId);
    const pigeonRef = doc(db, COLLECTIONS.PIGEONS, pigeonId);
    const [cageSnap, pigeonSnap] = await Promise.all([
      tx.get(cageRef),
      tx.get(pigeonRef),
    ]);

    if (!cageSnap.exists())   throw new Error('Cage introuvable');
    if (!pigeonSnap.exists()) throw new Error('Pigeon introuvable');

    const cage   = cageSnap.data()   as Cage;
    const pigeon = pigeonSnap.data() as Pigeon;

    if (cage.statut !== 'LIBRE')   throw new Error(`La cage ${cage.numero} est déjà occupée`);
    if (pigeon.statut !== 'ACTIF') throw new Error(`Le pigeon ${pigeon.matricule} n'est pas actif`);

    tx.update(cageRef, {
      statut   : 'OCCUPE_PIGEON',
      pigeonId,
      coupleId : null,
      updatedAt: serverTimestamp(),
    });

    const summary = `Affectation : ${pigeon.matricule} (${pigeon.nom})`;
    txAppendOcc(tx, cageId, {
      kind           : 'assign_pigeon',
      summary,
      pigeonId,
      coupleId       : null,
      otherCageId    : null,
      otherCageLabel : null,
      reasonCode     : null,
      reasonDetail   : null,
    });
  });
};

/**
 * RG-CAGE-03 : Affecter un couple à une cage
 * - cage doit être LIBRE
 * - couple doit être ACTIF
 * - opération ATOMIQUE (transaction)
 */
export const affecterCoupleACage = async (coupleId: string, cageId: string): Promise<void> => {
  await runTransaction(db, async (tx) => {
    const cageRef   = doc(db, COLLECTIONS.CAGES,   cageId);
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    const [cageSnap, coupleSnap] = await Promise.all([
      tx.get(cageRef),
      tx.get(coupleRef),
    ]);

    if (!cageSnap.exists())   throw new Error('Cage introuvable');
    if (!coupleSnap.exists()) throw new Error('Couple introuvable');

    const cage   = cageSnap.data()   as Cage;
    const couple = coupleSnap.data() as Couple;

    if (cage.statut !== 'LIBRE')    throw new Error(`La cage ${cage.numero} est déjà occupée`);
    if (couple.statut !== 'ACTIF')  throw new Error('Ce couple n\'est plus actif');

    const mRef = doc(db, COLLECTIONS.PIGEONS, couple.maleId);
    const fRef = doc(db, COLLECTIONS.PIGEONS, couple.femelleId);
    const [mSnap, fSnap] = await Promise.all([tx.get(mRef), tx.get(fRef)]);
    const m    = mSnap.exists() ? (mSnap.data() as Pigeon) : null;
    const f    = fSnap.exists() ? (fSnap.data() as Pigeon) : null;
    const mLab = m ? `${m.matricule}` : '?';
    const fLab = f ? `${f.matricule}` : '?';

    tx.update(cageRef, {
      statut   : 'OCCUPE_COUPLE',
      coupleId,
      pigeonId : null,
      updatedAt: serverTimestamp(),
    });

    tx.update(coupleRef, {
      cageId,
    });

    txAppendOcc(tx, cageId, {
      kind           : 'assign_couple',
      summary        : `Affectation couple : ${mLab} + ${fLab}`,
      pigeonId       : null,
      coupleId,
      otherCageId    : null,
      otherCageLabel : null,
      reasonCode     : null,
      reasonDetail   : null,
    });
  });
};

/**
 * RG-CAGE-02 : Libérer une cage (+ journal + raison optionnelle)
 */
export const libererCage = async (cageId: string, options: LibererCageOptions = {}): Promise<void> => {
  const reasonCode   = options.reasonCode?.trim() || null;
  const reasonDetail = options.reasonDetail?.trim() || null;

  await runTransaction(db, async (tx) => {
    const cageRef = doc(db, COLLECTIONS.CAGES, cageId);
    const snap      = await tx.get(cageRef);
    if (!snap.exists()) throw new Error('Cage introuvable');

    const cage       = snap.data() as Cage;
    const pigeonId   = cage.pigeonId ?? null;
    const coupleId   = cage.coupleId ?? null;

    if (cage.statut === 'LIBRE') throw new Error('Cette cage est déjà libre');

    let summary = 'Cage libérée';

    if (cage.statut === 'OCCUPE_PIGEON' && pigeonId) {
      const pSnap = await tx.get(doc(db, COLLECTIONS.PIGEONS, pigeonId));
      const p     = pSnap.exists() ? (pSnap.data() as Pigeon) : null;
      summary     = p ? `Libération : ${p.matricule} (${p.nom})` : 'Libération d’un pigeon';
    } else if (cage.statut === 'OCCUPE_COUPLE' && coupleId) {
      const cplRef = doc(db, COLLECTIONS.COUPLES, coupleId);
      const cSnap  = await tx.get(cplRef);
      const cpl    = cSnap.exists() ? (cSnap.data() as Couple) : null;
      if (cpl) {
        const mSnap = await tx.get(doc(db, COLLECTIONS.PIGEONS, cpl.maleId));
        const fSnap = await tx.get(doc(db, COLLECTIONS.PIGEONS, cpl.femelleId));
        const m     = mSnap.exists() ? (mSnap.data() as Pigeon) : null;
        const f     = fSnap.exists() ? (fSnap.data() as Pigeon) : null;
        summary     = `Libération couple : ${m?.matricule ?? '?'} + ${f?.matricule ?? '?'}`;
      } else {
        summary = 'Libération d’un couple';
      }
      tx.update(cplRef, { cageId: null });
    }

    tx.update(cageRef, {
      statut   : 'LIBRE',
      pigeonId : null,
      coupleId : null,
      updatedAt: serverTimestamp(),
    });

    txAppendOcc(tx, cageId, {
      kind           : 'release',
      summary,
      pigeonId,
      coupleId,
      otherCageId    : null,
      otherCageLabel : null,
      reasonCode,
      reasonDetail,
    });
  });
};

/**
 * Déplacer un pigeon seul d’une cage occupée vers une cage libre (atomique + journal sur les deux cages).
 */
export const deplacerPigeonVersCage = async (
  pigeonId: string,
  fromCageId: string,
  toCageId: string,
  options: DeplacerCageOptions = {},
): Promise<void> => {
  if (fromCageId === toCageId) throw new Error('Choisir une cage différente');

  const reasonCode   = options.reasonCode?.trim() || null;
  const reasonDetail = options.reasonDetail?.trim() || null;

  await runTransaction(db, async (tx) => {
    const fromRef = doc(db, COLLECTIONS.CAGES, fromCageId);
    const toRef   = doc(db, COLLECTIONS.CAGES, toCageId);
    const pRef    = doc(db, COLLECTIONS.PIGEONS, pigeonId);

    const [fromSnap, toSnap, pSnap] = await Promise.all([
      tx.get(fromRef),
      tx.get(toRef),
      tx.get(pRef),
    ]);

    if (!fromSnap.exists() || !toSnap.exists() || !pSnap.exists()) {
      throw new Error('Cage ou pigeon introuvable');
    }

    const from = fromSnap.data() as Cage;
    const to   = toSnap.data() as Cage;
    const p    = pSnap.data() as Pigeon;

    if (from.statut !== 'OCCUPE_PIGEON' || from.pigeonId !== pigeonId) {
      throw new Error('La cage d’origine ne contient pas ce pigeon');
    }
    if (to.statut !== 'LIBRE') throw new Error(`La cage ${to.numero} n’est pas libre`);
    if (p.statut !== 'ACTIF') throw new Error('Le pigeon n’est pas actif');

    const toLab = cageLabel(to);
    const fromLab = cageLabel(from);

    tx.update(fromRef, {
      statut   : 'LIBRE',
      pigeonId : null,
      coupleId : null,
      updatedAt: serverTimestamp(),
    });

    tx.update(toRef, {
      statut   : 'OCCUPE_PIGEON',
      pigeonId,
      coupleId : null,
      updatedAt: serverTimestamp(),
    });

    txAppendOcc(tx, fromCageId, {
      kind           : 'move_pigeon_out',
      summary        : `Depuis ${fromLab} vers ${toLab} : ${p.matricule} (${p.nom})`,
      pigeonId,
      coupleId       : null,
      otherCageId    : toCageId,
      otherCageLabel : toLab,
      reasonCode,
      reasonDetail,
    });

    txAppendOcc(tx, toCageId, {
      kind           : 'move_pigeon_in',
      summary        : `Depuis ${fromLab} : ${p.matricule} (${p.nom})`,
      pigeonId,
      coupleId       : null,
      otherCageId    : fromCageId,
      otherCageLabel : fromLab,
      reasonCode,
      reasonDetail,
    });
  });
};

/**
 * Déplacer un couple d’une cage vers une autre (atomique + journal).
 */
export const deplacerCoupleVersCage = async (
  coupleId: string,
  fromCageId: string,
  toCageId: string,
  options: DeplacerCageOptions = {},
): Promise<void> => {
  if (fromCageId === toCageId) throw new Error('Choisir une cage différente');

  const reasonCode   = options.reasonCode?.trim() || null;
  const reasonDetail = options.reasonDetail?.trim() || null;

  await runTransaction(db, async (tx) => {
    const fromRef   = doc(db, COLLECTIONS.CAGES,   fromCageId);
    const toRef     = doc(db, COLLECTIONS.CAGES,   toCageId);
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);

    const [fromSnap, toSnap, cSnap] = await Promise.all([
      tx.get(fromRef),
      tx.get(toRef),
      tx.get(coupleRef),
    ]);

    if (!fromSnap.exists() || !toSnap.exists() || !cSnap.exists()) {
      throw new Error('Cage ou couple introuvable');
    }

    const from   = fromSnap.data() as Cage;
    const to     = toSnap.data() as Cage;
    const couple = cSnap.data() as Couple;

    if (from.statut !== 'OCCUPE_COUPLE' || from.coupleId !== coupleId) {
      throw new Error('La cage d’origine ne contient pas ce couple');
    }
    if (to.statut !== 'LIBRE') throw new Error(`La cage ${to.numero} n’est pas libre`);
    if (couple.statut !== 'ACTIF') throw new Error('Le couple n’est plus actif');

    const mSnap = await tx.get(doc(db, COLLECTIONS.PIGEONS, couple.maleId));
    const fSnap = await tx.get(doc(db, COLLECTIONS.PIGEONS, couple.femelleId));
    const m     = mSnap.exists() ? (mSnap.data() as Pigeon) : null;
    const f     = fSnap.exists() ? (fSnap.data() as Pigeon) : null;
    const pair  = `${m?.matricule ?? '?'} + ${f?.matricule ?? '?'}`;

    const toLab   = cageLabel(to);
    const fromLab = cageLabel(from);

    tx.update(fromRef, {
      statut   : 'LIBRE',
      pigeonId : null,
      coupleId : null,
      updatedAt: serverTimestamp(),
    });

    tx.update(toRef, {
      statut   : 'OCCUPE_COUPLE',
      coupleId,
      pigeonId : null,
      updatedAt: serverTimestamp(),
    });

    tx.update(coupleRef, { cageId: toCageId });

    txAppendOcc(tx, fromCageId, {
      kind           : 'move_couple_out',
      summary        : `Depuis ${fromLab} vers ${toLab} : couple ${pair}`,
      pigeonId       : null,
      coupleId,
      otherCageId    : toCageId,
      otherCageLabel : toLab,
      reasonCode,
      reasonDetail,
    });

    txAppendOcc(tx, toCageId, {
      kind           : 'move_couple_in',
      summary        : `Depuis ${fromLab} : couple ${pair}`,
      pigeonId       : null,
      coupleId,
      otherCageId    : fromCageId,
      otherCageLabel : fromLab,
      reasonCode,
      reasonDetail,
    });
  });
};

/**
 * Fiche cage (respect du cloisonnement par compte).
 */
export const obtenirCage = async (cageId: string): Promise<Cage | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.CAGES, cageId));
  if (!snap.exists()) return null;
  const c = { id: snap.id, ...snap.data() } as Cage;
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  if (!c.ownerUid || c.ownerUid !== uid) return null;
  return c;
};

/**
 * Créer une nouvelle cage
 */
export const creerCage = async (data: CageFormData): Promise<string> => {
  const ownerUid = requireOwnerUid();
  const voliereCode = data.voliereCode ?? 'A';
  const ref = await addDoc(collection(db, COLLECTIONS.CAGES), {
    ...data,
    ownerUid,
    voliereCode,
    statut   : 'LIBRE',
    pigeonId : null,
    coupleId : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

const LOT_MAX = 120;
const BATCH_CHUNK = 400;

/**
 * Crée plusieurs cages en une ou plusieurs écritures batch Firestore (≤ 500 ops par batch).
 */
export const creerCagesLot = async (items: CageFormData[]): Promise<number> => {
  if (items.length === 0) throw new Error('Aucune cage à créer.');
  if (items.length > LOT_MAX) {
    throw new Error(`Maximum ${LOT_MAX} cages par lot (réduis la plage ou fais plusieurs envois).`);
  }

  const ownerUid = requireOwnerUid();
  const seen = new Set<string>();

  for (const raw of items) {
    const parsed = CageSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Données invalides';
      throw new Error(`Cage « ${raw.numero} » : ${msg}`);
    }
    const data = parsed.data;
    const key = `${data.voliereCode ?? 'A'}|${data.numero.trim()}`;
    if (seen.has(key)) throw new Error(`Numéro en double dans le lot : ${data.numero}`);
    seen.add(key);
  }

  let written = 0;
  for (let offset = 0; offset < items.length; offset += BATCH_CHUNK) {
    const slice = items.slice(offset, offset + BATCH_CHUNK);
    const batch = writeBatch(db);
    for (const data of slice) {
      const voliereCode = data.voliereCode ?? 'A';
      const ref = doc(collection(db, COLLECTIONS.CAGES));
      batch.set(ref, {
        ...data,
        ownerUid,
        voliereCode,
        statut   : 'LIBRE',
        pigeonId : null,
        coupleId : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    written += slice.length;
  }

  return written;
};

/**
 * Modifier une cage existante (infos seulement, pas le statut)
 */
export const modifierCage = async (cageId: string, data: Partial<CageFormData>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.CAGES, cageId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Supprimer une cage uniquement si elle est LIBRE
 */
export const supprimerCage = async (cageId: string): Promise<void> => {
  const cageSnap = await getDoc(doc(db, COLLECTIONS.CAGES, cageId));
  if (!cageSnap.exists()) throw new Error('Cage introuvable');

  const cage = cageSnap.data() as Cage;
  if (cage.statut !== 'LIBRE') throw new Error('Impossible de supprimer une cage occupée');

  await deleteDoc(doc(db, COLLECTIONS.CAGES, cageId));
};
