import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth } from '../firebase/authClient';
import { db } from '../firebase/config';
import { requireOwnerUid } from '../firebase/requireOwnerUid';
import { COLLECTIONS } from '../firebase/collections';
import type { Cage, Couple, Pigeon, PigeonFormData } from '../types';

/**
 * Créer un nouveau pigeon
 */
export const creerPigeon = async (data: PigeonFormData): Promise<string> => {
  const ownerUid = requireOwnerUid();
  const ref = await addDoc(collection(db, COLLECTIONS.PIGEONS), {
    ...data,
    ownerUid,
    statut   : 'ACTIF',
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

/**
 * Modifier un pigeon
 */
export const modifierPigeon = async (pigeonId: string, data: Partial<PigeonFormData>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.PIGEONS, pigeonId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Lecture d’une fiche pigeon (consultation).
 */
export const obtenirPigeon = async (pigeonId: string): Promise<Pigeon | null> => {
  const snap = await getDoc(doc(db, COLLECTIONS.PIGEONS, pigeonId));
  if (!snap.exists()) return null;
  const p = { id: snap.id, ...snap.data() } as Pigeon;
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  if (p.ownerUid !== uid) return null;
  return p;
};

/**
 * RG-PIGEON-01 : Soft delete uniquement
 * Un pigeon avec des descendants NE PEUT PAS être supprimé physiquement
 */
export const supprimerPigeon = async (pigeonId: string): Promise<void> => {
  const ownerUid = requireOwnerUid();
  // Vérifier s'il a des descendants (pereId ou mereId pointent vers lui)
  const qPere = query(
    collection(db, COLLECTIONS.PIGEONS),
    where('ownerUid', '==', ownerUid),
    where('pereId', '==', pigeonId),
  );
  const qMere = query(
    collection(db, COLLECTIONS.PIGEONS),
    where('ownerUid', '==', ownerUid),
    where('mereId', '==', pigeonId),
  );
  const [snapPere, snapMere] = await Promise.all([getDocs(qPere), getDocs(qMere)]);

  if (!snapPere.empty || !snapMere.empty) {
    throw new Error('Ce pigeon a des descendants — suppression logique uniquement');
  }

  await updateDoc(doc(db, COLLECTIONS.PIGEONS, pigeonId), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * RG-PIGEON-02 : Enregistrer une sortie avec cascade ATOMIQUE
 * 1. pigeon.statut → VENDU | MORT | PERDU
 * 2. cage libérée si occupée par ce pigeon seul (OCCUPE_PIGEON)
 * 3. couple rompu si pigeon dans un couple ACTIF + cage du couple libérée
 * 4. document Sortie créé (avec traçabilité cage / couple)
 *
 * Requêtes initiales pour connaître les refs à relire dans la transaction
 * (Firestore : toutes les lectures transaction.get avant les écritures).
 */
export const enregistrerSortie = async (data: {
  pigeonId    : string;
  type        : 'VENTE' | 'DECES' | 'PERTE';
  date        : Date;
  prix        : number | null;
  acheteur    : string | null;
  cause       : string | null;
  circonstance: string | null;
  notes       : string;
}): Promise<string> => {
  const ownerUid = requireOwnerUid();
  const pigeonRef = doc(db, COLLECTIONS.PIGEONS, data.pigeonId);

  const qCageSolo = query(
    collection(db, COLLECTIONS.CAGES),
    where('ownerUid', '==', ownerUid),
    where('pigeonId', '==', data.pigeonId),
  );
  const qCoupleM = query(
    collection(db, COLLECTIONS.COUPLES),
    where('ownerUid', '==', ownerUid),
    where('statut', '==', 'ACTIF'),
    where('maleId', '==', data.pigeonId),
  );
  const qCoupleF = query(
    collection(db, COLLECTIONS.COUPLES),
    where('ownerUid', '==', ownerUid),
    where('statut', '==', 'ACTIF'),
    where('femelleId', '==', data.pigeonId),
  );

  const [cageSoloSnap, coupleSnapM, coupleSnapF] = await Promise.all([
    getDocs(qCageSolo),
    getDocs(qCoupleM),
    getDocs(qCoupleF),
  ]);

  const cageSoloRefs = cageSoloSnap.docs.map(d => d.ref);

  const coupleById = new Map<string, (typeof coupleSnapM.docs)[number]>();
  for (const d of coupleSnapM.docs) coupleById.set(d.id, d);
  for (const d of coupleSnapF.docs) coupleById.set(d.id, d);
  const coupleDocs = [...coupleById.values()];

  if (coupleDocs.length > 1) {
    throw new Error('Données incohérentes : plusieurs couples actifs pour ce pigeon.');
  }

  const coupleRefs = coupleDocs.map(d => d.ref);

  const coupleCageIds = new Set<string>();
  let coupleRompuId: string | null = null;
  let conjointPigeonId: string | null = null;
  let cageCoupleIdLiberee: string | null = null;

  for (const d of coupleDocs) {
    const c = d.data() as Couple;
    coupleRompuId = d.id;
    conjointPigeonId = c.maleId === data.pigeonId ? c.femelleId : c.maleId;
    if (c.cageId) {
      coupleCageIds.add(c.cageId);
      cageCoupleIdLiberee = c.cageId;
    }
  }

  const coupleCageRefs = [...coupleCageIds].map(id => doc(db, COLLECTIONS.CAGES, id));

  const cageSoloIdLiberee = cageSoloRefs.length > 0 ? cageSoloRefs[0].id : null;

  const sortieRef = doc(collection(db, COLLECTIONS.SORTIES));

  const statutMap: Record<string, Pigeon['statut']> = {
    VENTE: 'VENDU',
    DECES: 'MORT',
    PERTE: 'PERDU',
  };

  const notesTrim = (data.notes ?? '').trim();

  await runTransaction(db, async tx => {
    const pigeonSnap = await tx.get(pigeonRef);
    if (!pigeonSnap.exists()) throw new Error('Pigeon introuvable');
    const pigeon = pigeonSnap.data() as Pigeon;
    if (pigeon.ownerUid && pigeon.ownerUid !== ownerUid) {
      throw new Error('Ce pigeon n’appartient pas à votre compte.');
    }
    if (pigeon.statut !== 'ACTIF') throw new Error('Ce pigeon n\'est plus actif');

    const soloSnaps = await Promise.all(cageSoloRefs.map(r => tx.get(r)));

    const coupleSnaps = await Promise.all(coupleRefs.map(r => tx.get(r)));

    const coupleCageSnaps = await Promise.all(coupleCageRefs.map(r => tx.get(r)));
    const snapByCageId = new Map<string, (typeof coupleCageSnaps)[number]>();
    coupleCageRefs.forEach((r, i) => {
      snapByCageId.set(r.id, coupleCageSnaps[i]);
    });

    for (let i = 0; i < cageSoloRefs.length; i++) {
      const s = soloSnaps[i];
      if (!s.exists()) continue;
      const cage = s.data() as Cage;
      if (cage.pigeonId === data.pigeonId && cage.statut === 'OCCUPE_PIGEON') {
        tx.update(cageSoloRefs[i], {
          statut   : 'LIBRE',
          pigeonId : null,
          updatedAt: serverTimestamp(),
        });
      }
    }

    for (let i = 0; i < coupleRefs.length; i++) {
      const cs = coupleSnaps[i];
      if (!cs.exists()) continue;
      const c = cs.data() as Couple;
      if (c.statut !== 'ACTIF') continue;
      if (c.maleId !== data.pigeonId && c.femelleId !== data.pigeonId) continue;

      const coupleId = coupleRefs[i].id;
      tx.update(coupleRefs[i], {
        statut : 'ROMPU',
        dateFin: serverTimestamp(),
      });

      if (c.cageId) {
        const cgSnap = snapByCageId.get(c.cageId);
        if (cgSnap?.exists()) {
          const cg = cgSnap.data() as Cage;
          if (cg.coupleId === coupleId) {
            tx.update(doc(db, COLLECTIONS.CAGES, c.cageId), {
              statut   : 'LIBRE',
              coupleId : null,
              pigeonId : null,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
    }

    tx.update(pigeonRef, {
      statut   : statutMap[data.type],
      updatedAt: serverTimestamp(),
    });

    tx.set(sortieRef, {
      ownerUid           : pigeon.ownerUid ?? ownerUid,
      pigeonId           : data.pigeonId,
      pigeonMatricule    : pigeon.matricule,
      type               : data.type,
      date               : Timestamp.fromDate(data.date),
      prix               : data.type === 'VENTE' ? data.prix : null,
      acheteur           : data.type === 'VENTE' ? data.acheteur : null,
      cause              : data.type === 'DECES' ? data.cause : null,
      circonstance       : data.type === 'PERTE' ? data.circonstance : null,
      notes              : notesTrim,
      cageSoloIdLiberee  : cageSoloIdLiberee,
      cageCoupleIdLiberee: cageCoupleIdLiberee,
      coupleRompuId,
      conjointPigeonId,
      createdAt          : serverTimestamp(),
    });
  });

  return sortieRef.id;
};

/**
 * Récupérer les enfants (généalogie) d'un pigeon
 */
export const getEnfants = async (pigeonId: string): Promise<Pigeon[]> => {
  const ownerUid = requireOwnerUid();
  const qPere = query(
    collection(db, COLLECTIONS.PIGEONS),
    where('ownerUid', '==', ownerUid),
    where('pereId', '==', pigeonId),
  );
  const qMere = query(
    collection(db, COLLECTIONS.PIGEONS),
    where('ownerUid', '==', ownerUid),
    where('mereId', '==', pigeonId),
  );
  const [snapPere, snapMere] = await Promise.all([getDocs(qPere), getDocs(qMere)]);

  const enfants = new Map<string, Pigeon>();
  [...snapPere.docs, ...snapMere.docs].forEach(d => {
    enfants.set(d.id, { id: d.id, ...d.data() } as Pigeon);
  });
  return Array.from(enfants.values());
};
