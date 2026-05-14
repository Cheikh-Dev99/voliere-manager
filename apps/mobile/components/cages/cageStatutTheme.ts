import type { CageStatut } from '@shared/types';

/**
 * Couleurs alignées sur Tailwind du web (`CageCell.jsx`) :
 * emerald-50/80, rose-50/80, amber-50/80 + bordures 200 + points 500.
 */
export const cageStatutTheme: Record<
  CageStatut,
  { border: string; cardBg: string; dot: string; birdColor: string }
> = {
  LIBRE: {
    border: '#a7f3d0',
    cardBg: 'rgba(236, 253, 245, 0.8)',
    dot: '#10b981',
    birdColor: '#059669',
  },
  OCCUPE_PIGEON: {
    border: '#fecdd3',
    cardBg: 'rgba(255, 241, 242, 0.8)',
    dot: '#f43f5e',
    birdColor: '#be123c',
  },
  OCCUPE_COUPLE: {
    border: '#fde68a',
    cardBg: 'rgba(255, 251, 235, 0.8)',
    dot: '#f59e0b',
    birdColor: '#b45309',
  },
};

export const cageStatutCenterText: Record<CageStatut, string> = {
  LIBRE: 'Libre',
  OCCUPE_PIGEON: '1 pigeon',
  OCCUPE_COUPLE: '2 pigeons',
};
