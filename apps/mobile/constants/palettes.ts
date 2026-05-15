/** Même structure que l’ancien `theme.ts` — valeurs adaptées au mode sombre. */
export type ThemeColors = {
  teal50: string;
  teal600: string;
  teal700: string;
  teal800: string;
  teal100: string;
  teal900: string;
  slate50: string;
  slate100: string;
  slate200: string;
  slate500: string;
  slate600: string;
  slate700: string;
  slate800: string;
  slate900: string;
  white: string;
  /** Cartes / barres : blanc en clair, ardoise en sombre (évite grandes zones blanches). */
  surfaceElevated: string;
  /** Pastille / segment « actif » au-dessus d’une surface élevée (sombre : un cran plus clair). */
  surfaceHighlight: string;
  emerald50: string;
  emerald900: string;
  rose50: string;
  rose900: string;
  amber50: string;
  amber950: string;
  red600: string;
  border: string;
  screenPadding: number;
  minTap: number;
  radiusLg: number;
  radiusMd: number;
  radiusSm: number;
};

export const lightPalette: ThemeColors = {
  teal50: '#f0fdfa',
  teal600: '#0d9488',
  teal700: '#0f766e',
  teal800: '#115e59',
  teal100: '#ccfbf1',
  teal900: '#134e4a',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  white: '#ffffff',
  surfaceElevated: '#ffffff',
  surfaceHighlight: '#ffffff',
  emerald50: '#ecfdf5',
  emerald900: '#064e3b',
  rose50: '#fff1f2',
  rose900: '#881337',
  amber50: '#fffbeb',
  amber950: '#451a03',
  red600: '#dc2626',
  border: '#e2e8f0',
  screenPadding: 16,
  minTap: 44,
  radiusLg: 14,
  radiusMd: 10,
  radiusSm: 8,
};

export const darkPalette: ThemeColors = {
  teal50: '#042f2e',
  teal600: '#14b8a6',
  teal700: '#2dd4bf',
  teal800: '#5eead4',
  teal100: '#134e4a',
  teal900: '#ccfbf1',
  slate50: '#0f172a',
  slate100: '#1e293b',
  slate200: '#334155',
  /** Textes secondaires un peu plus clairs pour le contraste sur fond sombre */
  slate500: '#b8c5d6',
  slate600: '#d2dbe6',
  slate700: '#e6ecf4',
  slate800: '#f0f4f9',
  slate900: '#f8fafc',
  white: '#ffffff',
  surfaceElevated: '#1e293b',
  surfaceHighlight: '#334155',
  emerald50: '#022c22',
  emerald900: '#6ee7b7',
  rose50: '#4c0519',
  rose900: '#fda4af',
  amber50: '#422006',
  amber950: '#fef3c7',
  red600: '#f87171',
  border: '#334155',
  screenPadding: 16,
  minTap: 44,
  radiusLg: 14,
  radiusMd: 10,
  radiusSm: 8,
};

export function shadowCardFor(c: ThemeColors, mode: 'light' | 'dark') {
  return {
    shadowColor: mode === 'dark' ? '#000000' : c.slate900,
    shadowOpacity: mode === 'dark' ? 0.35 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: mode === 'dark' ? 4 : 2,
  } as const;
}

export type ShadowCardStyle = ReturnType<typeof shadowCardFor>;
