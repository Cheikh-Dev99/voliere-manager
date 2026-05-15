import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  runTransaction,
} from 'firebase/firestore';
import type { Transaction } from 'firebase/firestore';
import { db } from '../firebase/config';
import { requireOwnerUid } from '../firebase/requireOwnerUid';
import { COLLECTIONS } from '../firebase/collections';
import type { Cage, CageOccupancyKind, Couple, CoupleFormData, Pigeon } from '../types';
import { CAGE_OCCUPANCY_EVENTS } from './cagesService';
import {
  validateCoupleSexes,
  validateOppositeSexesForDragCouple,
  validatePigeonsActifsForCouple,
} from '../utils/coupleValidation';

function assertPigeonAppartientAuCompte(p: Pigeon, uid: string, role: string): void {
  if (!p.ownerUid) {
    throw new Error(
      `${role} : pigeon sans ownerUid. Exécute une migration (npm run migrate:owner-uid) ou ajoute ownerUid dans la console Firebase.`,
    );
  }
  if (p.ownerUid !== uid) {
    throw new Error(`${role} : ce pigeon n’appartient pas à ton compte.`);
  }
}

/**
 * Vérifie qu'un pigeon n'est pas déjà dans un couple ACTIF
 */
const verifierDisponibilitePourCouple = async (pigeonId: string, ownerUid: string): Promise<void> => {
  const q1 = query(
    collection(db, COLLECTIONS.COUPLES),
    where('ownerUid', '==', ownerUid),
    where('statut', '==', 'ACTIF'),
    where('maleId', '==', pigeonId),
  );
  const q2 = query(
    collection(db, COLLECTIONS.COUPLES),
    where('ownerUid', '==', ownerUid),
    where('statut', '==', 'ACTIF'),
    where('femelleId', '==', pigeonId),
  );
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  if (!s1.empty || !s2.empty) {
    throw new Error('Ce pigeon est déjà dans un couple actif');
  }
};

/**
 * RG-COUPLE-01 : Créer un couple
 * - male.sexe === 'MALE' et femelle.sexe === 'FEMALE'
 * - aucun des deux n'est dans un couple ACTIF
 * - les deux doivent être ACTIF
 */
export const creerCouple = async (data: CoupleFormData): Promise<string> => {
  const ownerUid = requireOwnerUid();
  const [maleSnap, femelleSnap] = await Promise.all([
    getDoc(doc(db, COLLECTIONS.PIGEONS, data.maleId)),
    getDoc(doc(db, COLLECTIONS.PIGEONS, data.femelleId)),
  ]);

  if (!maleSnap.exists())    throw new Error('Le mâle est introuvable');
  if (!femelleSnap.exists()) throw new Error('La femelle est introuvable');

  const male    = maleSnap.data()    as Pigeon;
  const femelle = femelleSnap.data() as Pigeon;

  assertPigeonAppartientAuCompte(male, ownerUid, 'Mâle');
  assertPigeonAppartientAuCompte(femelle, ownerUid, 'Femelle');

  validateCoupleSexes(male.sexe, femelle.sexe);
  validatePigeonsActifsForCouple(male, femelle);

  await verifierDisponibilitePourCouple(data.maleId, ownerUid);
  await verifierDisponibilitePourCouple(data.femelleId, ownerUid);

  const qMaleCage = query(
    collection(db, COLLECTIONS.CAGES),
    where('ownerUid', '==', ownerUid),
    where('pigeonId', '==', data.maleId),
  );
  const qFemCage = query(
    collection(db, COLLECTIONS.CAGES),
    where('ownerUid', '==', ownerUid),
    where('pigeonId', '==', data.femelleId),
  );
  const [maleCageSnap, femCageSnap] = await Promise.all([getDocs(qMaleCage), getDocs(qFemCage)]);
  const maleCageAvantCoupleId = maleCageSnap.empty ? null : maleCageSnap.docs[0].id;
  const femelleCageAvantCoupleId = femCageSnap.empty ? null : femCageSnap.docs[0].id;

  const coupleRef = doc(collection(db, COLLECTIONS.COUPLES));
  await setDoc(coupleRef, {
    ownerUid,
    maleId   : data.maleId,
    femelleId: data.femelleId,
    dateDebut: Timestamp.fromDate(data.dateDebut),
    dateFin  : null,
    statut   : 'ACTIF',
    cageId   : data.cageId,
    notes    : data.notes,
    createdAt: serverTimestamp(),
    maleCageAvantCoupleId,
    femelleCageAvantCoupleId,
  });

  // Si une cage est spécifiée, l'affecter
  if (data.cageId) {
    const cageSnap = await getDoc(doc(db, COLLECTIONS.CAGES, data.cageId));
    if (!cageSnap.exists()) throw new Error('Cage introuvable');
    const cg = cageSnap.data() as Cage;
    if (cg.ownerUid && cg.ownerUid !== ownerUid) {
      throw new Error('Cette cage n’appartient pas à ton compte.');
    }
    await updateDoc(doc(db, COLLECTIONS.CAGES, data.cageId), {
      statut   : 'OCCUPE_COUPLE',
      coupleId : coupleRef.id,
      pigeonId : null,
      updatedAt: serverTimestamp(),
    });
  }

  return coupleRef.id;
};

function cageLabelShort(c: Pick<Cage, 'numero' | 'voliereCode'>): string {
  return `${c.voliereCode ?? 'A'} · ${c.numero}`;
}

function txAppendOccInTx(
  tx: Transaction,
  cageId: string,
  payload: {
    kind: CageOccupancyKind;
    summary: string;
    pigeonId: string | null;
    coupleId: string | null;
    otherCageId: string | null;
    otherCageLabel: string | null;
    reasonCode: string | null;
    reasonDetail: string | null;
  },
) {
  const ref = doc(collection(db, COLLECTIONS.CAGES, cageId, CAGE_OCCUPANCY_EVENTS));
  tx.set(ref, {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

/**
 * Crée un couple en glissant un pigeon actif sur la cage d’un autre pigeon seul (sexe opposé).
 * — Transaction : libère la cage du pigeon glissant (s’il en avait une), crée le couple, affecte la cage cible en OCCUPE_COUPLE.
 */
export const creerCoupleParGlissement = async (params: {
  pigeonGlissantId: string;
  cageCibleId: string;
  notes?: string;
}): Promise<string> => {
  const ownerUid = requireOwnerUid();
  const gid = params.pigeonGlissantId;
  const tid = params.cageCibleId;
  const notesCouple = (params.notes ?? '').trim() || 'Couple créé depuis la visualisation (glisser-déposer).';

  const targetRef = doc(db, COLLECTIONS.CAGES, tid);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) throw new Error('Cage introuvable');
  const target = targetSnap.data() as Cage;
  if (target.ownerUid && target.ownerUid !== ownerUid) {
    throw new Error('Cette cage n’appartient pas à ton compte.');
  }
  if (target.statut !== 'OCCUPE_PIGEON' || !target.pigeonId) {
    throw new Error('La cage cible doit contenir un seul pigeon (pas un couple, pas une cage vide).');
  }
  const oid = target.pigeonId;
  if (oid === gid) throw new Error('Impossible de glisser un pigeon sur sa propre cage.');

  const gRef = doc(db, COLLECTIONS.PIGEONS, gid);
  const oRef = doc(db, COLLECTIONS.PIGEONS, oid);
  const [gSnap, oSnap] = await Promise.all([getDoc(gRef), getDoc(oRef)]);
  if (!gSnap.exists() || !oSnap.exists()) throw new Error('Pigeon introuvable');

  const g = gSnap.data() as Pigeon;
  const o = oSnap.data() as Pigeon;

  assertPigeonAppartientAuCompte(g, ownerUid, 'Pigeon glissant');
  assertPigeonAppartientAuCompte(o, ownerUid, 'Pigeon sur la cage cible');

  if (g.statut !== 'ACTIF' || o.statut !== 'ACTIF') {
    throw new Error('Les deux pigeons doivent être actifs.');
  }
  validateOppositeSexesForDragCouple(g.sexe, o.sexe);

  await verifierDisponibilitePourCouple(gid, ownerUid);
  await verifierDisponibilitePourCouple(oid, ownerUid);

  const maleId = g.sexe === 'MALE' ? gid : oid;
  const femelleId = g.sexe === 'FEMALE' ? gid : oid;

  const qSrc = query(
    collection(db, COLLECTIONS.CAGES),
    where('ownerUid', '==', ownerUid),
    where('pigeonId', '==', gid),
  );
  const srcSnap = await getDocs(qSrc);
  let sourceCageId: string | null = null;
  if (!srcSnap.empty) {
    const d = srcSnap.docs.find((x) => x.id !== tid) ?? null;
    if (d) sourceCageId = d.id;
  }

  const coupleRef = doc(collection(db, COLLECTIONS.COUPLES));

  await runTransaction(db, async tx => {
    const tR = doc(db, COLLECTIONS.CAGES, tid);
    const gR = doc(db, COLLECTIONS.PIGEONS, gid);
    const oR = doc(db, COLLECTIONS.PIGEONS, oid);

    const reads = [tx.get(tR), tx.get(gR), tx.get(oR)];
    const srcR = sourceCageId ? doc(db, COLLECTIONS.CAGES, sourceCageId) : null;
    if (srcR) reads.push(tx.get(srcR));

    const snaps = await Promise.all(reads);
    const tS = snaps[0];
    const gS = snaps[1];
    const oS = snaps[2];
    const srcS = srcR ? snaps[3] : null;

    if (!tS.exists() || !gS.exists() || !oS.exists()) throw new Error('Données introuvables (transaction).');

    const t = tS.data() as Cage;
    const gP = gS.data() as Pigeon;
    const oP = oS.data() as Pigeon;

    if (t.ownerUid && t.ownerUid !== ownerUid) {
      throw new Error('La cage cible n’appartient pas à ton compte.');
    }

    if (t.statut !== 'OCCUPE_PIGEON' || t.pigeonId !== oid) {
      throw new Error('La cage cible a changé : réessaie après actualisation.');
    }
    if (gP.statut !== 'ACTIF' || oP.statut !== 'ACTIF') {
      throw new Error('Un pigeon n’est plus actif.');
    }
    if (gP.sexe === oP.sexe) throw new Error('Les sexes ne permettent pas le couple.');

    let sourceCageLabelForAssign: string | null = null;

    if (srcR && srcS?.exists()) {
      const src = srcS.data() as Cage;
      if (src.ownerUid && src.ownerUid !== ownerUid) {
        throw new Error('La cage source n’appartient pas à ton compte.');
      }
      if (src.statut !== 'OCCUPE_PIGEON' || src.pigeonId !== gid) {
        throw new Error('La cage du pigeon glissant a changé : réessaie.');
      }
      sourceCageLabelForAssign = cageLabelShort(src);
      tx.update(srcR, {
        statut: 'LIBRE',
        pigeonId: null,
        coupleId: null,
        updatedAt: serverTimestamp(),
      });
      txAppendOccInTx(tx, sourceCageId!, {
        kind: 'release',
        summary: `${gP.matricule} (${gP.nom}) — mis en couple vers ${cageLabelShort(t)}`,
        pigeonId: gid,
        coupleId: null,
        otherCageId: tid,
        otherCageLabel: cageLabelShort(t),
        reasonCode: 'MISE_EN_COUPLE',
        reasonDetail: `Couple avec ${oP.matricule}`,
      });
    }

    const maleCageAvantCoupleId = maleId === gid ? sourceCageId ?? null : tid;
    const femelleCageAvantCoupleId = femelleId === gid ? sourceCageId ?? null : tid;

    tx.set(coupleRef, {
      ownerUid,
      maleId,
      femelleId,
      dateDebut: Timestamp.fromDate(new Date()),
      dateFin: null,
      statut: 'ACTIF',
      cageId: tid,
      notes: notesCouple,
      createdAt: serverTimestamp(),
      maleCageAvantCoupleId,
      femelleCageAvantCoupleId,
    });

    tx.update(tR, {
      statut: 'OCCUPE_COUPLE',
      coupleId: coupleRef.id,
      pigeonId: null,
      updatedAt: serverTimestamp(),
    });

    const mLab = gP.sexe === 'MALE' ? gP.matricule : oP.matricule;
    const fLab = gP.sexe === 'FEMALE' ? gP.matricule : oP.matricule;

    txAppendOccInTx(tx, tid, {
      kind: 'assign_couple',
      summary: `Couple (glisser) : ${mLab} + ${fLab}`,
      pigeonId: null,
      coupleId: coupleRef.id,
      otherCageId: sourceCageId,
      otherCageLabel: sourceCageLabelForAssign,
      reasonCode: 'MISE_EN_COUPLE',
      reasonDetail: null,
    });
  });

  return coupleRef.id;
};

/**
 * RG-COUPLE-02 : Rompre un couple
 * - statut → ROMPU, dateFin
 * - cage du couple libérée si applicable
 * - si `maleCageAvantCoupleId` / `femelleCageAvantCoupleId` sont renseignés (création récente), replacer chaque pigeon en solo dans sa cage d’origine si elle est libre (ou la cage du couple après libération).
 */
export type RompreCoupleResult = {
  restoredMale: boolean;
  restoredFemelle: boolean;
  skipped: string[];
};

export const rompreCouple = async (coupleId: string): Promise<RompreCoupleResult> => {
  const ownerUid = requireOwnerUid();
  return runTransaction(db, async (tx) => {
    const coupleRef = doc(db, COLLECTIONS.COUPLES, coupleId);
    const coupleSnap = await tx.get(coupleRef);

    if (!coupleSnap.exists()) throw new Error('Couple introuvable');
    const couple = coupleSnap.data() as Couple;
    if (couple.ownerUid && couple.ownerUid !== ownerUid) {
      throw new Error('Ce couple n’appartient pas à ton compte.');
    }
    if (couple.statut !== 'ACTIF') throw new Error('Ce couple est déjà rompu');

    const maleRef = doc(db, COLLECTIONS.PIGEONS, couple.maleId);
    const femRef = doc(db, COLLECTIONS.PIGEONS, couple.femelleId);
    const malePrev = couple.maleCageAvantCoupleId ?? null;
    const femPrev = couple.femelleCageAvantCoupleId ?? null;
    const coupleCageId = couple.cageId ?? null;

    const cageIds = new Set<string>();
    if (coupleCageId) cageIds.add(coupleCageId);
    if (malePrev) cageIds.add(malePrev);
    if (femPrev) cageIds.add(femPrev);

    const cageRefs = [...cageIds].map((id) => doc(db, COLLECTIONS.CAGES, id));
    const cageSnaps = await Promise.all(cageRefs.map((r) => tx.get(r)));
    const cageById = new Map(cageRefs.map((r, i) => [r.id, cageSnaps[i]]));

    const [malePS, femPS] = await Promise.all([tx.get(maleRef), tx.get(femRef)]);
    if (!malePS.exists() || !femPS.exists()) throw new Error('Pigeon introuvable');
    const maleP = malePS.data() as Pigeon;
    const femP = femPS.data() as Pigeon;

    tx.update(coupleRef, {
      statut: 'ROMPU',
      dateFin: serverTimestamp(),
    });

    if (coupleCageId) {
      const cRef = doc(db, COLLECTIONS.CAGES, coupleCageId);
      const cs = cageById.get(coupleCageId);
      if (cs?.exists()) {
        const cg = cs.data() as Cage;
        if (cg.statut === 'OCCUPE_COUPLE' && cg.coupleId === coupleId) {
          tx.update(cRef, {
            statut: 'LIBRE',
            pigeonId: null,
            coupleId: null,
            updatedAt: serverTimestamp(),
          });
          txAppendOccInTx(tx, coupleCageId, {
            kind: 'release',
            summary: `Rupture du couple : ${maleP.matricule} + ${femP.matricule}`,
            pigeonId: null,
            coupleId,
            otherCageId: null,
            otherCageLabel: null,
            reasonCode: 'AUTRE',
            reasonDetail: 'Rompre le couple',
          });
        }
      }
    }

    const skipped: string[] = [];
    let restoredMale = false;
    let restoredFemelle = false;

    const coupleCageSnap = coupleCageId ? cageById.get(coupleCageId) : null;
    const coupleCageLabel =
      coupleCageSnap?.exists() ? cageLabelShort(coupleCageSnap.data() as Cage) : null;

    const tryRestore = (pigeonId: string, pigeon: Pigeon, prevId: string | null, kind: 'male' | 'femelle') => {
      if (!prevId) return
      const pref = doc(db, COLLECTIONS.CAGES, prevId)
      const ps = cageById.get(prevId)
      if (!ps?.exists()) {
        skipped.push(`${kind === 'male' ? 'Mâle' : 'Femelle'} : cage d’origine introuvable.`)
        return
      }
      const c0 = ps.data() as Cage

      if (prevId === coupleCageId) {
        tx.update(pref, {
          statut: 'OCCUPE_PIGEON',
          pigeonId,
          coupleId: null,
          updatedAt: serverTimestamp(),
        })
        txAppendOccInTx(tx, prevId, {
          kind: 'assign_pigeon',
          summary: `Après rupture couple : ${pigeon.matricule} (${pigeon.nom})`,
          pigeonId,
          coupleId: null,
          otherCageId: coupleCageId,
          otherCageLabel: coupleCageLabel,
          reasonCode: 'AUTRE',
          reasonDetail: 'Rupture couple — retour cage d’origine',
        })
        if (kind === 'male') restoredMale = true
        else restoredFemelle = true
        return
      }

      if (c0.statut !== 'LIBRE' || c0.pigeonId || c0.coupleId) {
        skipped.push(
          `${kind === 'male' ? 'Mâle' : 'Femelle'} : impossible de réoccuper ${c0.numero} (état ${c0.statut}).`,
        )
        return
      }

      tx.update(pref, {
        statut: 'OCCUPE_PIGEON',
        pigeonId,
        coupleId: null,
        updatedAt: serverTimestamp(),
      })
      txAppendOccInTx(tx, prevId, {
        kind: 'assign_pigeon',
        summary: `Après rupture couple : ${pigeon.matricule} (${pigeon.nom})`,
        pigeonId,
        coupleId: null,
        otherCageId: coupleCageId,
        otherCageLabel: coupleCageLabel,
        reasonCode: 'AUTRE',
        reasonDetail: 'Rupture couple — retour cage d’origine',
      })
      if (kind === 'male') restoredMale = true
      else restoredFemelle = true
    }

    type Slot = { pigeonId: string; pigeon: Pigeon; prev: string; kind: 'male' | 'femelle' }
    const slots: Slot[] = []
    if (malePrev) slots.push({ pigeonId: couple.maleId, pigeon: maleP, prev: malePrev, kind: 'male' })
    if (femPrev) slots.push({ pigeonId: couple.femelleId, pigeon: femP, prev: femPrev, kind: 'femelle' })
    slots.sort((a, b) => {
      const ac = coupleCageId && a.prev === coupleCageId ? 1 : 0
      const bc = coupleCageId && b.prev === coupleCageId ? 1 : 0
      return ac - bc
    })
    for (const s of slots) {
      tryRestore(s.pigeonId, s.pigeon, s.prev, s.kind)
    }

    return { restoredMale, restoredFemelle, skipped }
  })
}

/**
 * Charge un couple par id (lecture seule).
 */
export async function obtenirCouple(coupleId: string): Promise<Couple | null> {
  const ownerUid = requireOwnerUid();
  const ref = doc(db, COLLECTIONS.COUPLES, coupleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const row = { id: snap.id, ...(snap.data() as Omit<Couple, 'id'>) } as Couple;
  if (row.ownerUid && row.ownerUid !== ownerUid) {
    throw new Error('Ce couple n’appartient pas à ton compte.');
  }
  return row;
}
