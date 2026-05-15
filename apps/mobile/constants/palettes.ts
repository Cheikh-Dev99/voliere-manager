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

export type ShadowStyle = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

/** Niveaux d’élévation alignés sur le web (vmElevation1–4). */
export function shadowFor(
  c: ThemeColors,
  mode: 'light' | 'dark',
  level: 1 | 2 | 3 | 4,
): ShadowStyle {
  const dark = mode === 'dark';
  const baseColor = dark ? '#000000' : c.slate900;
  const presets: Record<1 | 2 | 3 | 4, ShadowStyle> = {
    1: {
      shadowColor: baseColor,
      shadowOpacity: dark ? 0.32 : 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: dark ? 3 : 2,
    },
    2: {
      shadowColor: baseColor,
      shadowOpacity: dark ? 0.38 : 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: dark ? 4 : 3,
    },
    3: {
      shadowColor: baseColor,
      shadowOpacity: dark ? 0.45 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: dark ? 6 : 5,
    },
    4: {
      shadowColor: baseColor,
      shadowOpacity: dark ? 0.52 : 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: dark ? 8 : 7,
    },
  };
  return presets[level];
}

/** Carte standard (équivalent vmElevation1 / shadow-sm). */
export function shadowCardFor(c: ThemeColors, mode: 'light' | 'dark') {
  return shadowFor(c, mode, 1);
}

export type ShadowCardStyle = ReturnType<typeof shadowCardFor>;

export type ThemeShadows = {
  card: ShadowStyle;
  raised: ShadowStyle;
  overlay: ShadowStyle;
  floating: ShadowStyle;
};

export function shadowsFor(c: ThemeColors, mode: 'light' | 'dark'): ThemeShadows {
  return {
    card: shadowFor(c, mode, 1),
    raised: shadowFor(c, mode, 2),
    overlay: shadowFor(c, mode, 3),
    floating: shadowFor(c, mode, 4),
  };
}

/** Feedback press cohérent (boutons, cartes, onglets). */
export const motionPress = {
  scale: 0.97,
  opacity: 0.92,
} as const;

export const motionDuration = {
  fast: 150,
  base: 220,
  slow: 420,
} as const;
