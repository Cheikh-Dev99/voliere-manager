import type { Timestamp } from 'firebase/firestore';

import type { Couple, PigeonStatut } from '../types';

type PigeonCoupleContext = {
  id: string;
  statut: PigeonStatut;
  deletedAt?: Timestamp | null;
};

/** IDs des pigeons présents dans au moins un couple au statut ACTIF. */
export function buildPigeonIdsInActifsCouples(couples: Couple[]): Set<string> {
  const ids = new Set<string>();
  for (const c of couples) {
    if (c.statut !== 'ACTIF') continue;
    if (c.maleId) ids.add(c.maleId);
    if (c.femelleId) ids.add(c.femelleId);
  }
  return ids;
}

/** True si le pigeon est enregistré comme ACTIF et apparaît dans un couple actif. */
export function pigeonEstEnCoupleActif(
  pigeon: { id: string; statut: PigeonStatut },
  pigeonIdsDansCouplesActifs: Set<string>,
): boolean {
  return pigeon.statut === 'ACTIF' && pigeonIdsDansCouplesActifs.has(pigeon.id);
}

/**
 * Colonne « Couples » : uniquement pour l’effectif **ACTIF** (hors archivé).
 * Vendu, mort, perdu ou archivé → cellule vide côté UI (`null`).
 */
export function libelleColonneCouplePigeon(
  pigeon: PigeonCoupleContext,
  pigeonIdsDansCouplesActifs: Set<string>,
): 'Libre' | 'En couple' | null {
  if (pigeon.deletedAt) return null;
  if (pigeon.statut !== 'ACTIF') return null;
  return pigeonEstEnCoupleActif(pigeon, pigeonIdsDansCouplesActifs) ? 'En couple' : 'Libre';
}

/** Libellé affiché en liste / tableau (≠ valeur stockée `statut`). */
export function libelleStatutListePigeon(
  pigeon: PigeonCoupleContext,
  pigeonIdsDansCouplesActifs: Set<string>,
  libellesStatut: Record<PigeonStatut, string>,
): string {
  if (pigeon.deletedAt) return 'Archivé';
  if (pigeonEstEnCoupleActif(pigeon, pigeonIdsDansCouplesActifs)) return 'En couple';
  return libellesStatut[pigeon.statut];
}
