/**
 * Teintes indicatives pour l’aperçu UI (robe pigeon — approximation visuelle).
 */
export const PIGEON_COULEUR_HEX: Readonly<Record<string, string>> = {
  Argenté: '#c4ccd4',
  'Argenté barré': '#b0bcc8',
  Blanc: '#f4f4f5',
  Bleu: '#5b7fc7',
  'Bleu acier': '#3d5a80',
  'Bleu barré': '#4a6fa5',
  'Bleu barré à calotte blanche': '#5a7ab8',
  'Bleu barré à ailes blanches': '#6b8cc9',
  'Bleu clair': '#7ca0d8',
  'Bleu écaillé': '#5c6bc0',
  'Bleu maillé': '#4d6bb5',
  Bronzé: '#8b6914',
  Chocolat: '#5d4037',
  'Chocolat barré': '#6d4c41',
  Cendré: '#9e9e9e',
  Crème: '#fff8e1',
  Doré: '#d4a574',
  'Doré à croissant': '#c9956a',
  'Doré barré': '#c9a227',
  Fauve: '#c67b4c',
  'Fauve barré': '#b86a3d',
  Grison: '#78909c',
  'Grison barré': '#607d8b',
  Isabelle: '#d7ccc8',
  Jaune: '#fdd835',
  'Jaune à ailes noires': '#f9a825',
  Laque: '#b71c1c',
  Lavande: '#b39ddb',
  Meunier: '#a1887f',
  Noir: '#212121',
  'Noir barré': '#37474f',
  'Noir à calotte blanche': '#263238',
  'Pie bleu': '#5c6bc0',
  'Pie noir': '#424242',
  'Pie rouge': '#c62828',
  Rouge: '#c62828',
  'Rouge barré': '#b71c1c',
  'Rouge cendré': '#a65d57',
  Satiné: '#eceff1',
  Schimmel: '#cfd8dc',
  'Tête de maure (bleu)': '#3949ab',
  'Tête de maure (noir)': '#1a237e',
  Tigré: '#8d6e63',
  'Vieux rose': '#d4a5a5',
  Violet: '#6a1b9a',
  'Zimt (cannelle)': '#a1887f',
} as const

/** Noms triés pour les listes déroulantes */
export const PIGEON_COULEURS_NOMS_REFERENCE: readonly string[] = Object.keys(PIGEON_COULEUR_HEX).sort((a, b) =>
  a.localeCompare(b, 'fr', { sensitivity: 'base' }),
)

export function hexForCouleurReference(nom: string): string | undefined {
  return PIGEON_COULEUR_HEX[nom]
}
