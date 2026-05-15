import type { Pigeon, PigeonStatut } from '../types';

export type SortieType = 'VENTE' | 'DECES' | 'PERTE';

const STATUT_MAP: Record<SortieType, PigeonStatut> = {
  VENTE: 'VENDU',
  DECES: 'MORT',
  PERTE: 'PERDU',
};

export function mapSortieTypeToStatut(type: SortieType): PigeonStatut {
  return STATUT_MAP[type];
}

/** RG sortie : pigeon doit exister côté métier et rester ACTIF. */
export function assertPigeonActifPourSortie(pigeon: Pick<Pigeon, 'statut' | 'ownerUid'>, ownerUid: string): void {
  if (pigeon.ownerUid && pigeon.ownerUid !== ownerUid) {
    throw new Error('Ce pigeon n’appartient pas à votre compte.');
  }
  if (pigeon.statut !== 'ACTIF') {
    throw new Error('Ce pigeon n\'est plus actif');
  }
}

/** Soft delete : pigeon non déjà archivé. */
export function assertPigeonArchivable(pigeon: Pick<Pigeon, 'deletedAt' | 'ownerUid'>, ownerUid: string): void {
  if (pigeon.ownerUid && pigeon.ownerUid !== ownerUid) {
    throw new Error('Ce pigeon n’appartient pas à votre compte.');
  }
  if (pigeon.deletedAt) {
    throw new Error('Ce pigeon est déjà archivé');
  }
}
