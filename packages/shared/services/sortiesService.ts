import { doc, getDoc } from 'firebase/firestore';

import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import { requireOwnerUid } from '../firebase/requireOwnerUid';
import type { Sortie } from '../types';

/**
 * Charge une sortie par id (lecture seule).
 */
export async function obtenirSortie(sortieId: string): Promise<Sortie | null> {
  const ownerUid = requireOwnerUid();
  const ref = doc(db, COLLECTIONS.SORTIES, sortieId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const row = { id: snap.id, ...(snap.data() as Omit<Sortie, 'id'>) } as Sortie;
  if (row.ownerUid && row.ownerUid !== ownerUid) {
    throw new Error('Cette sortie n’appartient pas à ton compte.');
  }
  return row;
}
