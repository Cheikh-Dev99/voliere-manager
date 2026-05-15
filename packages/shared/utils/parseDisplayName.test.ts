import { describe, expect, it } from 'vitest';
import { parseDisplayName } from './parseDisplayName';

describe('parseDisplayName', () => {
  it('découpe prénom et nom', () => {
    expect(parseDisplayName('Amadou Diop')).toEqual({ prenom: 'Amadou', nom: 'Diop' });
  });

  it('un seul mot → prénom seulement', () => {
    expect(parseDisplayName('Fatou')).toEqual({ prenom: 'Fatou', nom: '' });
  });

  it('nom composé', () => {
    expect(parseDisplayName('Jean Pierre Martin')).toEqual({
      prenom: 'Jean',
      nom   : 'Pierre Martin',
    });
  });

  it('vide ou null', () => {
    expect(parseDisplayName(null)).toEqual({ prenom: '', nom: '' });
    expect(parseDisplayName('   ')).toEqual({ prenom: '', nom: '' });
  });
});
