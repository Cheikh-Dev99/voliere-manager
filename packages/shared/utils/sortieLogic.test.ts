import { describe, expect, it } from 'vitest';
import {
  assertPigeonActifPourSortie,
  assertPigeonArchivable,
  mapSortieTypeToStatut,
} from './sortieLogic';

describe('mapSortieTypeToStatut', () => {
  it('mappe les types de sortie', () => {
    expect(mapSortieTypeToStatut('VENTE')).toBe('VENDU');
    expect(mapSortieTypeToStatut('DECES')).toBe('MORT');
    expect(mapSortieTypeToStatut('PERTE')).toBe('PERDU');
  });
});

describe('assertPigeonActifPourSortie', () => {
  it('accepte un pigeon actif du compte', () => {
    expect(() =>
      assertPigeonActifPourSortie({ statut: 'ACTIF', ownerUid: 'u1' }, 'u1'),
    ).not.toThrow();
  });

  it('refuse un pigeon déjà sorti', () => {
    expect(() =>
      assertPigeonActifPourSortie({ statut: 'VENDU', ownerUid: 'u1' }, 'u1'),
    ).toThrow(/actif/);
  });

  it('refuse un pigeon d’un autre compte', () => {
    expect(() =>
      assertPigeonActifPourSortie({ statut: 'ACTIF', ownerUid: 'other' }, 'u1'),
    ).toThrow(/compte/);
  });
});

describe('assertPigeonArchivable', () => {
  it('refuse un pigeon déjà archivé', () => {
    expect(() =>
      assertPigeonArchivable({ deletedAt: {} as never, ownerUid: 'u1' }, 'u1'),
    ).toThrow(/archivé/);
  });
});
