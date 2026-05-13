export const COLLECTIONS = {
  USERS         : 'users',
  PIGEONS       : 'pigeons',
  COUPLES       : 'couples',
  REPRODUCTIONS : 'reproductions',
  SORTIES       : 'sorties',
  CAGES         : 'cages',
} as const;

export const PIGEON_STATUTS = {
  ACTIF : 'ACTIF',
  VENDU : 'VENDU',
  MORT  : 'MORT',
  PERDU : 'PERDU',
} as const;

export const CAGE_STATUTS = {
  LIBRE          : 'LIBRE',
  OCCUPE_PIGEON  : 'OCCUPE_PIGEON',
  OCCUPE_COUPLE  : 'OCCUPE_COUPLE',
} as const;

export const COUPLE_STATUTS = {
  ACTIF : 'ACTIF',
  ROMPU : 'ROMPU',
} as const;

export const SORTIE_TYPES = {
  VENTE : 'VENTE',
  DECES : 'DECES',
  PERTE : 'PERTE',
} as const;

export const SEXES = {
  MALE   : 'MALE',
  FEMALE : 'FEMALE',
} as const;

// Labels affichés dans l'interface
export const SEXE_LABELS: Record<string, string> = {
  MALE  : 'Mâle',
  FEMALE: 'Femelle',
};

export const STATUT_LABELS: Record<string, string> = {
  ACTIF : 'Actif',
  VENDU : 'Vendu',
  MORT  : 'Décédé',
  PERDU : 'Perdu',
};

export const SORTIE_LABELS: Record<string, string> = {
  VENTE : 'Vente',
  DECES : 'Décès',
  PERTE : 'Perte',
};

export const CAGE_STATUT_LABELS: Record<string, string> = {
  LIBRE         : 'Libre',
  OCCUPE_PIGEON : '1 pigeon',
  OCCUPE_COUPLE : 'Couple',
};
