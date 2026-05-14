import { Timestamp } from 'firebase/firestore';

// ============================================================
// ÉNUMÉRATIONS MÉTIER
// ============================================================

export type PigeonSexe   = 'MALE' | 'FEMALE';
export type PigeonStatut = 'ACTIF' | 'VENDU' | 'MORT' | 'PERDU';
export type CageStatut   = 'LIBRE' | 'OCCUPE_PIGEON' | 'OCCUPE_COUPLE';

/** Historique des mouvements d’une cage (`cages/{cageId}/evenements`). */
export type CageOccupancyKind =
  | 'assign_pigeon'
  | 'assign_couple'
  | 'release'
  | 'move_pigeon_out'
  | 'move_pigeon_in'
  | 'move_couple_out'
  | 'move_couple_in';

export interface CageOccupancyEvent {
  id         : string;
  kind       : CageOccupancyKind;
  createdAt  : Timestamp;
  summary    : string;
  pigeonId   : string | null;
  coupleId   : string | null;
  otherCageId: string | null;
  /** Ex. « A · A04 » pour un déplacement */
  otherCageLabel: string | null;
  reasonCode   : string | null;
  reasonDetail : string | null;
}

/** Entrée du carnet santé (`pigeons/{id}/evenements_sante`). */
export interface PigeonHealthEvent {
  id         : string;
  ownerUid   ?: string;
  summary    : string;
  detail     : string;
  /** Date « métier » de l’événement (consultation, symptôme…). */
  occurredAt : Timestamp;
  createdAt  : Timestamp;
}
export type CoupleStatut = 'ACTIF' | 'ROMPU';
export type SortieType   = 'VENTE' | 'DECES' | 'PERTE';

// ============================================================
// INTERFACES MÉTIER
// ============================================================

/**
 * Pigeon — unité de base de l'élevage
 * RG : soft delete uniquement (deletedAt)
 * RG : statut peut être ACTIF, VENDU, MORT ou PERDU
 */
export interface Pigeon {
  id           : string;
  /** Propriétaire Firebase Auth — isole les données par compte. */
  ownerUid     ?: string;
  matricule    : string;       // identifiant unique (ex: SN-2024-001)
  nom          : string;
  sexe         : PigeonSexe;
  race         : string;
  dateNaissance: Timestamp;
  couleur      : string;
  statut       : PigeonStatut;
  photo        : string | null;
  pereId       : string | null; // généalogie
  mereId       : string | null; // généalogie
  notes        : string;
  createdAt    : Timestamp;
  updatedAt    : Timestamp;
  deletedAt    : Timestamp | null; // soft delete
}

/**
 * Cage — compartiment de la volière
 * RG : une cage contient soit 0, 1 pigeon, ou 1 couple (jamais plus)
 * RG : pigeonId et coupleId ne peuvent pas être non-null en même temps
 */
export interface Cage {
  id         : string;
  ownerUid   ?: string;
  numero     : string;       // ex: A01, B03
  nom        : string;
  superficie : number;       // en m²
  description: string;
  /** Regroupement UI (ex. « Volière A ») — défaut logique `A` si absent en base */
  voliereCode?: string;
  statut     : CageStatut;
  pigeonId   : string | null; // null si LIBRE ou OCCUPE_COUPLE
  coupleId   : string | null; // null si LIBRE ou OCCUPE_PIGEON
  createdAt  : Timestamp;
  updatedAt  : Timestamp;
}

/**
 * Couple — association mâle + femelle pour reproduction
 * RG : 1 mâle + 1 femelle, sexes opposés obligatoires
 * RG : un pigeon ne peut appartenir qu'à 1 seul couple ACTIF à la fois
 */
export interface Couple {
  id        : string;
  ownerUid  ?: string;
  maleId    : string;
  femelleId : string;
  dateDebut : Timestamp;
  dateFin   : Timestamp | null;
  statut    : CoupleStatut;
  cageId    : string | null;
  notes     : string;
  createdAt : Timestamp;
  /** Cage solo du mâle avant mise en couple (restauration à la rupture) */
  maleCageAvantCoupleId?: string | null;
  /** Cage solo de la femelle avant mise en couple */
  femelleCageAvantCoupleId?: string | null;
}

/**
 * Reproduction — naissance de pigeonneaux
 * RG : permet de retracer l'arbre généalogique
 */
export interface Reproduction {
  id                : string;
  ownerUid          ?: string;
  coupleId          : string;
  datePonte         : Timestamp;
  dateEclosion      : Timestamp | null;
  nombreOeufs       : number;
  nombrePigeonneaux : number;
  pigeonneauxIds    : string[];
  notes             : string;
  createdAt         : Timestamp;
}

/**
 * Sortie — fin de vie dans l'élevage (vente, décès, perte)
 * RG : déclenche cascade : pigeon.statut change + cage libérée + couple rompu
 */
export interface Sortie {
  id           : string;
  ownerUid     ?: string;
  pigeonId     : string;
  /** Matricule au moment de la sortie (historique sans jointure) */
  pigeonMatricule?: string;
  type         : SortieType;
  date         : Timestamp;
  prix         : number | null;    // pour VENTE
  acheteur     : string | null;    // pour VENTE
  cause        : string | null;    // pour DECES
  circonstance : string | null;    // pour PERTE
  notes        : string;
  createdAt    : Timestamp;
  /** Cage avec un pigeon seul libérée (si applicable) */
  cageSoloIdLiberee?: string | null;
  /** Cage du couple rompu libérée (si applicable) */
  cageCoupleIdLiberee?: string | null;
  /** Couple actif rompu (si applicable) */
  coupleRompuId?: string | null;
  /** Autre membre du couple rompu (traçabilité) */
  conjointPigeonId?: string | null;
}

/**
 * Profil colombophile (`users/{uid}`) — enrichit Firebase Auth (nom / élevage affichés dans l’UI).
 */
export interface UserProfile {
  id         : string;
  email      ?: string;
  prenom     ?: string;
  nom        ?: string;
  /** Nom d’élevage ou de volière affiché (ex. « Élevage Baay Pitàq »). */
  nomElevage ?: string;
  /**
   * Codes volière (bâtiments / zones) gérés dans l’app, même sans cage encore.
   * Fusionnés en UI avec les codes issus des cages existantes.
   */
  voliereCodes?: string[];
  createdAt  ?: Timestamp;
  updatedAt  ?: Timestamp;
}

// ============================================================
// TYPES FORM (sans les champs auto-générés)
// ============================================================

export type PigeonFormData = Omit<Pigeon, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CageFormData   = Omit<Cage,   'id' | 'createdAt' | 'updatedAt' | 'statut' | 'pigeonId' | 'coupleId'>;
export type CoupleFormData = { maleId: string; femelleId: string; dateDebut: Date; cageId: string | null; notes: string };
export type SortieFormData = Omit<Sortie, 'id' | 'createdAt'>;

export type ReproductionFormData = {
  coupleId         : string;
  datePonte        : Date;
  dateEclosion     : Date | null;
  nombreOeufs      : number;
  nombrePigeonneaux: number;
  notes            : string;
};
