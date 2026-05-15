import { useMemo } from 'react';

import type { ShadowCardStyle, ThemeColors } from '../constants/palettes';
import { useAppTheme } from '../context/AppThemeContext';

/** Styles dépendants du thème (clair / sombre) — évite `constants/theme` figé en mode clair. */
export function useThemedStyles<T>(
  create: (theme: ThemeColors, shadowCard: ShadowCardStyle) => T,
): T {
  const { colors, shadowCard } = useAppTheme();
  // create est une factory stable (définie hors composant)
  return useMemo(() => create(colors, shadowCard), [colors, shadowCard]);
}
