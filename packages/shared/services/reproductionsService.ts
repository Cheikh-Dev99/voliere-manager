import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { requireOwnerUid } from '../firebase/requireOwnerUid';
import { COLLECTIONS } from '../firebase/collections';
import type { Couple, Pigeon, Reproduction, ReproductionFormData } from '../types';

/** Comparaison au jour calendaire (UTC) pour dates métier saisies en local. */
function calendarDayUtcMs(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function pigeonBirthCalendarDayUtcMs(p: Pigeon): number {
  const d = p.dateNaissance.toDate();
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Les parents doivent être nés au plus tard le jour de la ponte et le jour de l’éclosion (si renseignée).
 */
export function assertParentsBirthBeforeReproductionDates(
  male: Pigeon,
  femelle: Pigeon,
  datePonte: Date,
  dateEclosion: Date | null,
): void {
  const ponteDay = calendarDayUtcMs(datePonte);
  const eclosionDay = dateEclosion ? calendarDayUtcMs(dateEclosion) : null;

  if (eclosionDay !== null && eclosionDay < ponteDay) {
    throw new Error('La date d’éclosion ne peut pas précéder la date de ponte.');
  }

  const check = (p: Pigeon, role: string) => {
    const birthDay = pigeonBirthCalendarDayUtcMs(p);
    if (birthDay > ponteDay) {
      throw new Error(
        `${role} (${p.matricule}) : la date de naissance est postérieure à la date de ponte — vérifie les fiches ou les dates de la portée.`,
      );
    }
    if (eclosionDay !== null && birthDay > eclosionDay) {
      throw new Error(
        `${role} (${p.matricule}) : la date de naissance est postérieure à la date d’éclosion — vérifie les fiches ou les dates de la portée.`,
      );
    }
  };
  check(male, 'Mâle');
  check(femelle, 'Femelle');
}

/**
 * Enregistrer une reproduction
 */
export const enregistrerReproduction = async (data: ReproductionFormData): Promise<string> => {
  const ownerUid = requireOwnerUid();
  const coupleSnap = await getDoc(doc(db, COLLECTIONS.COUPLES, data.coupleId));
  if (!coupleSnap.exists()) throw new Error('Couple introuvable');

  const couple = coupleSnap.data() as Couple;
  if (!couple.ownerUid || couple.ownerUid !== ownerUid) {
    throw new Error('Ce couple n’appartient pas à ton compte ou données incomplètes.');
  }
  if (couple.statut !== 'ACTIF') throw new Error('Ce couple n\'est plus actif');

  const maleSnap = await getDoc(doc(db, COLLECTIONS.PIGEONS, couple.maleId));
  const femSnap = await getDoc(doc(db, COLLECTIONS.PIGEONS, couple.femelleId));
  if (!maleSnap.exists() || !femSnap.exists()) throw new Error('Pigeon du couple introuvable');
  const male = maleSnap.data() as Pigeon;
  const fem = femSnap.data() as Pigeon;

  const checkP = (p: Pigeon, label: string) => {
    if (!p.ownerUid || p.ownerUid !== ownerUid) {
      throw new Error(`${label} : pigeon sans propriétaire valide pour ce compte.`);
    }
    if (p.statut !== 'ACTIF') {
      throw new Error(`${label} (${p.matricule}) doit être actif pour enregistrer une reproduction.`);
    }
  };
  checkP(male, 'Mâle');
  checkP(fem, 'Femelle');

  assertParentsBirthBeforeReproductionDates(male, fem, data.datePonte, data.dateEclosion);

  const ref = await addDoc(collection(db, COLLECTIONS.REPRODUCTIONS), {
    ownerUid,
    coupleId          : data.coupleId,
    datePonte         : Timestamp.fromDate(data.datePonte),
    dateEclosion      : data.dateEclosion ? Timestamp.fromDate(data.dateEclosion) : null,
    nombreOeufs       : data.nombreOeufs,
    nombrePigeonneaux : data.nombrePigeonneaux,
    pigeonneauxIds    : [],
    notes             : data.notes,
    createdAt         : serverTimestamp(),
  });

  return ref.id;
};

/**
 * Ajouter un pigeonneau à une reproduction
 * (le pigeon doit avoir été créé au préalable avec pereId/mereId renseignés)
 */
export const ajouterPigeonneau = async (reproductionId: string, pigeonneauId: string): Promise<void> => {
  const ownerUid = requireOwnerUid();
  const reprSnap = await getDoc(doc(db, COLLECTIONS.REPRODUCTIONS, reproductionId));
  if (!reprSnap.exists()) throw new Error('Reproduction introuvable');

  const reproduction = reprSnap.data() as {
    ownerUid?: string;
    coupleId?: string;
    pigeonneauxIds?: string[];
  };
  if (!reproduction.ownerUid || reproduction.ownerUid !== ownerUid) {
    throw new Error('Cette reproduction n’appartient pas à ton compte.');
  }

  const coupleId = reproduction.coupleId;
  if (!coupleId) throw new Error('Reproduction sans couple associé.');

  const coupleSnap = await getDoc(doc(db, COLLECTIONS.COUPLES, coupleId));
  if (!coupleSnap.exists()) throw new Error('Couple introuvable');
  const couple = coupleSnap.data() as Couple;
  if (!couple.ownerUid || couple.ownerUid !== ownerUid) {
    throw new Error('Couple non autorisé pour cette reproduction.');
  }

  const pigeonSnap = await getDoc(doc(db, COLLECTIONS.PIGEONS, pigeonneauId));
  if (!pigeonSnap.exists()) throw new Error('Pigeon introuvable');
  const pigeon = pigeonSnap.data() as Pigeon;
  if (!pigeon.ownerUid || pigeon.ownerUid !== ownerUid) {
    throw new Error('Ce pigeon n’appartient pas à ton compte.');
  }
  if (pigeon.pereId !== couple.maleId || pigeon.mereId !== couple.femelleId) {
    throw new Error(
      'Le pigeonneau doit avoir comme père le mâle du couple et comme mère la femelle du couple (fiche pigeon : père / mère).',
    );
  }

  const existing = reproduction.pigeonneauxIds || [];
  if (existing.includes(pigeonneauId)) {
    throw new Error('Ce pigeon est déjà lié à cette reproduction.');
  }

  const ids = [...existing, pigeonneauId];

  await updateDoc(doc(db, COLLECTIONS.REPRODUCTIONS, reproductionId), {
    pigeonneauxIds: ids,
  });
};

/**
 * Charge une reproduction par id (lecture seule).
 */
export async function obtenirReproduction(reproductionId: string): Promise<Reproduction | null> {
  const ownerUid = requireOwnerUid();
  const ref = doc(db, COLLECTIONS.REPRODUCTIONS, reproductionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const row = { id: snap.id, ...(snap.data() as Omit<Reproduction, 'id'>) } as Reproduction;
  if (row.ownerUid && row.ownerUid !== ownerUid) {
    throw new Error('Cette reproduction n’appartient pas à ton compte.');
  }
  return row;
}
