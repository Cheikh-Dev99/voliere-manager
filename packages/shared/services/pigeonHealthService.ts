import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { requireOwnerUid } from '../firebase/requireOwnerUid';
import { COLLECTIONS } from '../firebase/collections';
import type { Pigeon } from '../types';

/** Sous-collection `pigeons/{pigeonId}/evenements_sante`. */
export const PIGEON_HEALTH_EVENTS = 'evenements_sante' as const;

export type PigeonHealthFormData = {
  summary   : string;
  detail   ?: string;
  /** Si absent : date du jour (heure locale). */
  occurredAt?: Date;
};

/**
 * Ajoute une entrée au carnet santé d’un pigeon (consultation, traitement, observation…).
 */
export const ajouterEvenementSante = async (
  pigeonId: string,
  data: PigeonHealthFormData,
): Promise<string> => {
  const ownerUid = requireOwnerUid();
  const pigeonRef = doc(db, COLLECTIONS.PIGEONS, pigeonId);
  const pigeonSnap = await getDoc(pigeonRef);
  if (!pigeonSnap.exists()) throw new Error('Pigeon introuvable');

  const pigeon = pigeonSnap.data() as Pigeon;
  if (!pigeon.ownerUid || pigeon.ownerUid !== ownerUid) {
    throw new Error('Ce pigeon n’appartient pas à ton compte.');
  }

  const summary = data.summary.trim();
  if (!summary) throw new Error('Le résumé est obligatoire.');

  const occurredAt = data.occurredAt
    ? Timestamp.fromDate(data.occurredAt)
    : Timestamp.now();

  const col = collection(db, COLLECTIONS.PIGEONS, pigeonId, PIGEON_HEALTH_EVENTS);
  const ref = await addDoc(col, {
    ownerUid,
    summary,
    detail: (data.detail ?? '').trim(),
    occurredAt,
    createdAt: serverTimestamp(),
  });

  return ref.id;
};
