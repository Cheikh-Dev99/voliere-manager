import type { Pigeon } from '../types';

/**
 * Prochain matricule type cahier DTS (ex. P001, P011) : préfixe P + numéro séquentiel
 * d’après les pigeons déjà en base dont le matricule suit ce motif.
 */
export function proposerMatriculeSuivant(pigeonsList: Pigeon[]): string {
  const re = /^P(\d+)$/i;
  let max = 0;
  for (const p of pigeonsList) {
    const mat = p.matricule?.trim();
    if (!mat) continue;
    const m = mat.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  if (next <= 999) return `P${String(next).padStart(3, '0')}`;
  return `P${next}`;
}
