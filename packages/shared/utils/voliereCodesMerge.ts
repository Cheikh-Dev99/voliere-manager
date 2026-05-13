import type { Cage } from '../types';

import { collectVoliereCodesFromCages } from './cageNumeroProposition';

/** Longueur max alignée sur les formulaires cage (saisie code volière). */
export const VOLIERE_CODE_MAX_LEN = 12;

/**
 * Normalise une saisie utilisateur pour un code volière (compartiment / bâtiment).
 * Retourne null si invalide.
 */
export function normalizeVoliereCodeInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.length > VOLIERE_CODE_MAX_LEN) return null;
  if (/[\n\r\t]/.test(t)) return null;
  return t;
}

/**
 * Liste des codes volière affichés dans l’UI : codes déclarés dans le profil
 * `users/{uid}.voliereCodes` fusionnés avec ceux déjà présents sur les cages.
 * Si le résultat est vide (nouveau compte sans rien), retourne `['A']`.
 */
export function mergeProfileVoliereCodesWithCages(
  declared: string[] | undefined | null,
  cagesList: Cage[],
): string[] {
  const s = new Set<string>();
  if (Array.isArray(declared)) {
    for (const item of declared) {
      if (typeof item !== 'string') continue;
      const n = normalizeVoliereCodeInput(item);
      if (n) s.add(n);
    }
  }
  for (const c of collectVoliereCodesFromCages(cagesList)) {
    s.add(c);
  }
  if (s.size === 0) s.add('A');
  return Array.from(s).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
}

/** Indique si au moins une cage utilise ce code volière (suppression interdite). */
export function isVoliereCodeUsedByCages(code: string, cagesList: Cage[]): boolean {
  const norm = normalizeVoliereCodeInput(code);
  if (!norm) return false;
  return cagesList.some((c) => (c.voliereCode ?? 'A').trim() === norm);
}
