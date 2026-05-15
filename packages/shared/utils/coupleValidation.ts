import type { PigeonStatut } from '../types';

/** RG-COUPLE-01 : sexes mâle / femelle obligatoires. */
export function validateCoupleSexes(maleSexe: string, femelleSexe: string): void {
  if (maleSexe !== 'MALE') {
    throw new Error('Le premier pigeon doit être un mâle');
  }
  if (femelleSexe !== 'FEMALE') {
    throw new Error('Le second pigeon doit être une femelle');
  }
}

/** Les deux pigeons doivent être ACTIF pour former un couple. */
export function validatePigeonsActifsForCouple(
  male: { matricule: string; statut: PigeonStatut },
  femelle: { matricule: string; statut: PigeonStatut },
): void {
  if (male.statut !== 'ACTIF') {
    throw new Error(`Le mâle ${male.matricule} n'est pas actif`);
  }
  if (femelle.statut !== 'ACTIF') {
    throw new Error(`La femelle ${femelle.matricule} n'est pas active`);
  }
}

/** Création couple par glissement : sexes opposés. */
export function validateOppositeSexesForDragCouple(sexeA: string, sexeB: string): void {
  if (sexeA === sexeB) {
    throw new Error('Les deux pigeons doivent être de sexe opposé pour former un couple.');
  }
}

/** Indique si au moins un document enfant référence le pigeon comme parent. */
export function pigeonHasDescendants(
  pereDocs: { empty: boolean },
  mereDocs: { empty: boolean },
): boolean {
  return !pereDocs.empty || !mereDocs.empty;
}
