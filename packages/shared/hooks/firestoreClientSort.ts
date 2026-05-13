import type { Timestamp } from 'firebase/firestore';
import type { Cage, Couple, Pigeon, Reproduction, Sortie } from '../types';

export function tsMillis(t: Timestamp | undefined | null): number {
  return t?.toMillis?.() ?? 0;
}

/** Tri cages par numéro (cohérent avec compareCages / tri UI). */
export function sortCagesByNumeroAsc(cages: Cage[]): Cage[] {
  return [...cages].sort((a, b) =>
    a.numero.localeCompare(b.numero, undefined, { numeric: true }),
  );
}

/** Tri pigeons par matricule (ordre lexicographique proche de l’ancien orderBy Firestore). */
export function sortPigeonsByMatriculeAsc(rows: Pigeon[]): Pigeon[] {
  return [...rows].sort((a, b) =>
    (a.matricule ?? '').localeCompare(b.matricule ?? '', undefined, { numeric: true }),
  );
}

export function sortCouplesByDateDebutDesc(rows: Couple[]): Couple[] {
  return [...rows].sort((a, b) => tsMillis(b.dateDebut) - tsMillis(a.dateDebut));
}

export function sortSortiesByDateDesc(rows: Sortie[]): Sortie[] {
  return [...rows].sort((a, b) => tsMillis(b.date) - tsMillis(a.date));
}

export function sortReproductionsByDatePonteDesc(rows: Reproduction[]): Reproduction[] {
  return [...rows].sort((a, b) => tsMillis(b.datePonte) - tsMillis(a.datePonte));
}
