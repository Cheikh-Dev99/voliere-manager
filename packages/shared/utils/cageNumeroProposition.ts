import type { Cage } from '../types';

/** Maximum de cages créées en une fois (aligné web). */
export const CAGE_LOT_MAX = 120;

export function buildNumerosRange(prefix: string, start: number, end: number, padDigits: number): string[] {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const list: string[] = [];
  for (let i = lo; i <= hi; i += 1) {
    list.push(`${prefix}${String(i).padStart(padDigits, '0')}`);
  }
  return list;
}

/** Codes volière distincts présents dans les cages en base (tri naturel). */
export function collectVoliereCodesFromCages(cagesList: Cage[]): string[] {
  const s = new Set<string>();
  for (const c of cagesList) {
    const v = (c.voliereCode ?? 'A').trim();
    if (v) s.add(v);
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
}

/**
 * Prochain numéro de cage pour une volière : analyse les suffixes numériques des cages déjà enregistrées
 * (ex. A01, A02 ou 01, 02 si le numéro est sans préfixe lettre).
 */
export function proposerNumeroCageSuivant(
  voliereCode: string,
  cagesList: Cage[],
  excludeCageId?: string,
): string {
  const vol = (voliereCode ?? 'A').trim() || 'A';
  const same = cagesList.filter((c) => {
    if (excludeCageId && c.id === excludeCageId) return false;
    return (c.voliereCode ?? 'A').trim() === vol;
  });
  let maxN = 0;
  let maxSuffixLen = 0;
  let withNumero = 0;
  let numericOnlyMatches = 0;
  for (const c of same) {
    const raw = (c.numero ?? '').trim();
    if (!raw) continue;
    withNumero += 1;
    if (/^\d+$/.test(raw)) numericOnlyMatches += 1;
    const m = raw.match(/(\d+)$/);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n)) {
      maxN = Math.max(maxN, n);
      maxSuffixLen = Math.max(maxSuffixLen, m[1].length);
    }
  }
  const next = maxN + 1;
  const pad = Math.max(2, String(next).length, maxSuffixLen);
  const useNumericOnly =
    same.length > 0 && withNumero === same.length && withNumero > 0 && numericOnlyMatches === withNumero;
  if (useNumericOnly) {
    return String(next).padStart(pad, '0');
  }
  return `${vol}${String(next).padStart(pad, '0')}`;
}
