import { describe, expect, it } from 'vitest';
import type { Cage, Couple, Pigeon } from '../types';
import { compareCages, occupantPigeons, primaryRaceKey } from './voliereCageList';

function ts() {
  return { toDate: () => new Date('2020-01-01') } as Pigeon['dateNaissance'];
}

function pigeon(partial: Partial<Pigeon> & Pick<Pigeon, 'id' | 'matricule'>): Pigeon {
  return {
    id: partial.id,
    matricule: partial.matricule,
    nom: partial.nom ?? 'N',
    sexe: partial.sexe ?? 'MALE',
    race: partial.race ?? 'Race',
    dateNaissance: partial.dateNaissance ?? ts(),
    couleur: partial.couleur ?? '',
    statut: partial.statut ?? 'ACTIF',
    photo: partial.photo ?? null,
    pereId: partial.pereId ?? null,
    mereId: partial.mereId ?? null,
    notes: partial.notes ?? '',
    createdAt: partial.createdAt ?? ts(),
    updatedAt: partial.updatedAt ?? ts(),
    deletedAt: partial.deletedAt ?? null,
  };
}

describe('occupantPigeons', () => {
  it('retourne le pigeon seul', () => {
    const p = pigeon({ id: 'p1', matricule: 'P001' });
    const cage: Cage = {
      id: 'c1',
      numero: 'A01',
      nom: 'C1',
      superficie: 1,
      description: '',
      statut: 'OCCUPE_PIGEON',
      pigeonId: 'p1',
      coupleId: null,
      createdAt: ts(),
      updatedAt: ts(),
    };
    const m = new Map([['p1', p]]);
    expect(occupantPigeons(cage, m, new Map(), new Map(), new Map())).toEqual([p]);
  });

  it('retourne mâle et femelle pour un couple', () => {
    const m = pigeon({ id: 'm1', matricule: 'P001' });
    const f = pigeon({ id: 'f1', matricule: 'P002', sexe: 'FEMALE' });
    const cp: Couple = {
      id: 'cp1',
      maleId: 'm1',
      femelleId: 'f1',
      dateDebut: ts(),
      dateFin: null,
      statut: 'ACTIF',
      cageId: 'c1',
      notes: '',
      createdAt: ts(),
    };
    const cage: Cage = {
      id: 'c1',
      numero: 'A01',
      nom: 'C1',
      superficie: 1,
      description: '',
      statut: 'OCCUPE_COUPLE',
      pigeonId: null,
      coupleId: 'cp1',
      createdAt: ts(),
      updatedAt: ts(),
    };
    const pigeonById = new Map([
      ['m1', m],
      ['f1', f],
    ]);
    const coupleById = new Map([['cp1', cp]]);
    const maleByCouple = new Map([['cp1', m]]);
    const femelleByCouple = new Map([['cp1', f]]);
    expect(occupantPigeons(cage, pigeonById, coupleById, maleByCouple, femelleByCouple)).toEqual([m, f]);
  });
});

describe('primaryRaceKey', () => {
  it('prend la première race triée parmi les occupants', () => {
    const zebra = pigeon({ id: 'z', matricule: 'Z', race: 'Zebra' });
    const alpha = pigeon({ id: 'a', matricule: 'A', race: 'Alpha' });
    const cp: Couple = {
      id: 'cp1',
      maleId: 'z',
      femelleId: 'a',
      dateDebut: ts(),
      dateFin: null,
      statut: 'ACTIF',
      cageId: 'c1',
      notes: '',
      createdAt: ts(),
    };
    const cage: Cage = {
      id: 'c1',
      numero: 'A01',
      nom: 'C1',
      superficie: 1,
      description: '',
      statut: 'OCCUPE_COUPLE',
      pigeonId: null,
      coupleId: 'cp1',
      createdAt: ts(),
      updatedAt: ts(),
    };
    const pigeonById = new Map([
      ['z', zebra],
      ['a', alpha],
    ]);
    const coupleById = new Map([['cp1', cp]]);
    const maleByCouple = new Map([['cp1', zebra]]);
    const femelleByCouple = new Map([['cp1', alpha]]);
    const key = primaryRaceKey(cage, pigeonById, coupleById, maleByCouple, femelleByCouple);
    expect(key).toBe('Alpha');
  });
});

describe('compareCages', () => {
  const emptyMaps = () => ({
    pigeonById: new Map<string, Pigeon>(),
    coupleById: new Map<string, Couple>(),
    maleByCouple: new Map<string, Pigeon>(),
    femelleByCouple: new Map<string, Pigeon>(),
  });

  function cage(numero: string, statut: Cage['statut'] = 'LIBRE'): Cage {
    return {
      id: numero,
      numero,
      nom: `Nom ${numero}`,
      superficie: 1,
      description: '',
      statut,
      pigeonId: null,
      coupleId: null,
      createdAt: ts(),
      updatedAt: ts(),
    };
  }

  it('trie par numéro croissant', () => {
    const maps = emptyMaps();
    const a = cage('A2');
    const b = cage('A10');
    expect(compareCages(a, b, 'numero', 'asc', maps.pigeonById, maps.coupleById, maps.maleByCouple, maps.femelleByCouple)).toBeLessThan(0);
  });

  it('trie par statut alphabétique', () => {
    const maps = emptyMaps();
    const libre = cage('X', 'LIBRE');
    const occ = cage('Y', 'OCCUPE_PIGEON');
    const cmp = compareCages(libre, occ, 'statut', 'asc', maps.pigeonById, maps.coupleById, maps.maleByCouple, maps.femelleByCouple);
    expect(cmp).toBeLessThan(0);
  });
});
