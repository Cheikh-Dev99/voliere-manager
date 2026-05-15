import type { CageStatut } from '@shared/types';

export type CageStatutVisual = { border: string; cardBg: string; dot: string; birdColor: string };

/**
 * Couleurs alignées sur Tailwind du web (`CageCell.jsx`) :
 * emerald-50/80, rose-50/80, amber-50/80 + bordures 200 + points 500.
 */
export const cageStatutTheme: Record<CageStatut, CageStatutVisual> = {
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

/** Pastels assombris pour cartes cage en mode sombre (lisibilité du texte clair). */
export const cageStatutThemeDark: Record<CageStatut, CageStatutVisual> = {
  LIBRE: {
    border: 'rgba(52, 211, 153, 0.45)',
    cardBg: 'rgba(6, 78, 59, 0.55)',
    dot: '#34d399',
    birdColor: '#d1fae5',
  },
  OCCUPE_PIGEON: {
    border: 'rgba(251, 113, 133, 0.45)',
    cardBg: 'rgba(88, 28, 28, 0.5)',
    dot: '#fb7185',
    birdColor: '#fecdd3',
  },
  OCCUPE_COUPLE: {
    border: 'rgba(251, 191, 36, 0.45)',
    cardBg: 'rgba(120, 53, 15, 0.45)',
    dot: '#fbbf24',
    birdColor: '#fef3c7',
  },
};

export function cageStatutVisualFor(resolved: 'light' | 'dark', statut: CageStatut): CageStatutVisual {
  return resolved === 'dark' ? cageStatutThemeDark[statut] : cageStatutTheme[statut];
}

export const cageStatutCenterText: Record<CageStatut, string> = {
  LIBRE: 'Libre',
  OCCUPE_PIGEON: '1 pigeon',
  OCCUPE_COUPLE: '2 pigeons',
};
