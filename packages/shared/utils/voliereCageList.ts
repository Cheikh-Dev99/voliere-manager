import type { Cage, Couple, Pigeon } from '../types';

/**
 * Pigeons présents dans une cage (0, 1 ou 2) — logique partagée liste / tri / filtres volière.
 */
export function occupantPigeons(
  c: Cage,
  pigeonById: Map<string, Pigeon>,
  coupleById: Map<string, Couple>,
  maleByCouple: Map<string, Pigeon>,
  femelleByCouple: Map<string, Pigeon>,
): Pigeon[] {
  if (c.statut === 'OCCUPE_PIGEON' && c.pigeonId) {
    const p = pigeonById.get(c.pigeonId);
    return p ? [p] : [];
  }
  if (c.statut === 'OCCUPE_COUPLE' && c.coupleId) {
    const cp = coupleById.get(c.coupleId);
    if (!cp) return [];
    const m = maleByCouple.get(cp.id);
    const f = femelleByCouple.get(cp.id);
    return [m, f].filter(Boolean) as Pigeon[];
  }
  return [];
}

export function cageMatchesQuery(
  c: Cage,
  qNorm: string,
  pigeonById: Map<string, Pigeon>,
  coupleById: Map<string, Couple>,
  maleByCouple: Map<string, Pigeon>,
  femelleByCouple: Map<string, Pigeon>,
): boolean {
  if (!qNorm) return true;
  if (c.numero.toLowerCase().includes(qNorm)) return true;
  if ((c.nom ?? '').toLowerCase().includes(qNorm)) return true;
  if ((c.description ?? '').toLowerCase().includes(qNorm)) return true;
  for (const p of occupantPigeons(c, pigeonById, coupleById, maleByCouple, femelleByCouple)) {
    if (p.matricule.toLowerCase().includes(qNorm)) return true;
    if ((p.nom ?? '').toLowerCase().includes(qNorm)) return true;
    if ((p.race ?? '').toLowerCase().includes(qNorm)) return true;
    if ((p.notes ?? '').toLowerCase().includes(qNorm)) return true;
  }
  return false;
}

export function primaryRaceKey(
  c: Cage,
  pigeonById: Map<string, Pigeon>,
  coupleById: Map<string, Couple>,
  maleByCouple: Map<string, Pigeon>,
  femelleByCouple: Map<string, Pigeon>,
): string {
  const ps = occupantPigeons(c, pigeonById, coupleById, maleByCouple, femelleByCouple);
  if (ps.length === 0) return '';
  return (
    ps
      .map((p) => (p.race ?? '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))[0] ?? ''
  );
}

export function compareCages(
  a: Cage,
  b: Cage,
  sortBy: string,
  sortDir: string,
  pigeonById: Map<string, Pigeon>,
  coupleById: Map<string, Couple>,
  maleByCouple: Map<string, Pigeon>,
  femelleByCouple: Map<string, Pigeon>,
): number {
  const dir = sortDir === 'desc' ? -1 : 1;
  let cmp: number;
  switch (sortBy) {
    case 'nom':
      cmp = (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' });
      break;
    case 'race': {
      const ra = primaryRaceKey(a, pigeonById, coupleById, maleByCouple, femelleByCouple);
      const rb = primaryRaceKey(b, pigeonById, coupleById, maleByCouple, femelleByCouple);
      cmp = ra.localeCompare(rb, 'fr', { sensitivity: 'base' });
      break;
    }
    case 'statut':
      cmp = a.statut.localeCompare(b.statut);
      break;
    default:
      cmp = a.numero.localeCompare(b.numero, undefined, { numeric: true });
  }
  if (cmp !== 0) return cmp * dir;
  return a.numero.localeCompare(b.numero, undefined, { numeric: true });
}
