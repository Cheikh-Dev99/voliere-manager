import { describe, expect, it } from 'vitest';
import {
  pigeonHasDescendants,
  validateCoupleSexes,
  validateOppositeSexesForDragCouple,
  validatePigeonsActifsForCouple,
} from './coupleValidation';

describe('validateCoupleSexes', () => {
  it('accepte mâle + femelle', () => {
    expect(() => validateCoupleSexes('MALE', 'FEMALE')).not.toThrow();
  });

  it('refuse deux mâles', () => {
    expect(() => validateCoupleSexes('MALE', 'MALE')).toThrow(/femelle/);
  });

  it('refuse deux femelles', () => {
    expect(() => validateCoupleSexes('FEMALE', 'FEMALE')).toThrow(/mâle/);
  });
});

describe('validatePigeonsActifsForCouple', () => {
  it('refuse un pigeon non actif', () => {
    expect(() =>
      validatePigeonsActifsForCouple(
        { matricule: 'M1', statut: 'VENDU' },
        { matricule: 'F1', statut: 'ACTIF' },
      ),
    ).toThrow(/M1/);
  });
});

describe('validateOppositeSexesForDragCouple', () => {
  it('refuse le même sexe', () => {
    expect(() => validateOppositeSexesForDragCouple('MALE', 'MALE')).toThrow(/opposé/);
  });
});

describe('pigeonHasDescendants', () => {
  it('retourne true si enfant via père ou mère', () => {
    expect(pigeonHasDescendants({ empty: false }, { empty: true })).toBe(true);
    expect(pigeonHasDescendants({ empty: true }, { empty: false })).toBe(true);
    expect(pigeonHasDescendants({ empty: true }, { empty: true })).toBe(false);
  });
});
