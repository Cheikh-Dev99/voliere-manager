import type { Timestamp } from 'firebase/firestore';

import type { Pigeon } from '../types';
import { libelleColonneCouplePigeon } from './pigeonCoupleDisplay';

/** Échappe une cellule CSV (point-virgule, style Excel FR). */
export function csvEscape(value: unknown): string {
  const s = String(value ?? '');
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function cellDate(ts: Timestamp | null | undefined): string {
  if (!ts) return '';
  try {
    return ts.toDate().toLocaleDateString('fr-FR', {
      day  : '2-digit',
      month: '2-digit',
      year : 'numeric',
    });
  } catch {
    return '';
  }
}

export const PIGEON_CSV_HEADERS = [
  'Matricule',
  'Nom',
  'Sexe',
  'Race',
  'Date naissance',
  'Couleur',
  'Statut',
  'Couple (effectif)',
  'Archivé',
  'Notes',
  'Id Firestore',
] as const;

export function buildPigeonCsvRows(
  pigeons: Pigeon[],
  pigeonIdsEnCouplesActifs: Set<string>,
): string[][] {
  return pigeons.map((p) => {
    const couple = libelleColonneCouplePigeon(p, pigeonIdsEnCouplesActifs) ?? '';
    const archived = p.deletedAt ? 'Oui' : 'Non';
    return [
      p.matricule,
      p.nom,
      p.sexe,
      p.race,
      cellDate(p.dateNaissance),
      p.couleur,
      p.statut,
      couple,
      archived,
      (p.notes ?? '').replace(/\r\n/g, '\n'),
      p.id,
    ];
  });
}

/** Contenu CSV UTF-8 avec BOM (Excel). Séparateur `;` aligné sur le web. */
export function buildPigeonsCsvDelimited(
  pigeons: Pigeon[],
  pigeonIdsEnCouplesActifs: Set<string>,
  separator = ';',
): string {
  const BOM = '\uFEFF';
  const headerLine = [...PIGEON_CSV_HEADERS].map(csvEscape).join(separator);
  const dataLines = buildPigeonCsvRows(pigeons, pigeonIdsEnCouplesActifs).map((row) =>
    row.map(csvEscape).join(separator),
  );
  return BOM + [headerLine, ...dataLines].join('\n');
}
