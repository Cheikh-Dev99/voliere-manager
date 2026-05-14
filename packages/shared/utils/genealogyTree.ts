import type { Pigeon } from '../types';

/**
 * Construit les lignes du tableau ascendant : ancêtres les plus lointains en premier,
 * le sujet (profondeur 0) en dernier. `maxGen` = générations au-dessus du sujet (2 = parents + grands-parents).
 * Aligné sur `CageGenealogyView.jsx` (web).
 */
export function buildAncestorRows(
  rootId: string,
  pigeonById: ReadonlyMap<string, Pigeon>,
  maxGen = 2,
): string[][] {
  const genById = new Map<string, number>();
  const queue: { id: string; g: number }[] = [{ id: rootId, g: 0 }];
  const seen = new Set<string>();

  while (queue.length) {
    const item = queue.shift();
    if (!item) continue;
    const { id, g } = item;
    if (!id || g > maxGen) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    genById.set(id, g);
    const p = pigeonById.get(id);
    if (!p) continue;
    if (p.pereId) queue.push({ id: p.pereId, g: g + 1 });
    if (p.mereId) queue.push({ id: p.mereId, g: g + 1 });
  }

  const depths = [...genById.values()];
  const maxG = depths.length ? Math.max(0, ...depths) : 0;
  const rows: string[][] = [];
  for (let gv = maxG; gv >= 0; gv -= 1) {
    const ids = [...genById.entries()]
      .filter(([, d]) => d === gv)
      .map(([pid]) => pid);
    ids.sort((a, b) => {
      const pa = pigeonById.get(a);
      const pb = pigeonById.get(b);
      return (pa?.matricule ?? a).localeCompare(pb?.matricule ?? b, 'fr', { numeric: true });
    });
    rows.push(ids);
  }
  return rows;
}

export function generationLabel(depthFromSubject: number): string {
  if (depthFromSubject === 0) return 'Sujet';
  if (depthFromSubject === 1) return 'Parents';
  if (depthFromSubject === 2) return 'Grands-parents';
  return `Ancêtres (+${depthFromSubject})`;
}
