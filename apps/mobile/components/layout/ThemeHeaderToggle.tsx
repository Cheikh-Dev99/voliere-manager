import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';

import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { AnimatedPressable } from '../ui/AnimatedPressable';

function createStyles(theme: ThemeColors, shadowCard: ReturnType<typeof import('../../constants/palettes').shadowCardFor>) {
  return StyleSheet.create({
    btn: {
      width: 40,
      height: 40,
      borderRadius: theme.radiusLg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadowCard,
    },
  });
}

/**
 * Bascule rapide clair / sombre (icône = thème actuellement affiché).
 * Clair / Auto / Sombre reste dans la feuille profil (Apparence).
 */
export function ThemeHeaderToggle() {
  const { resolved, setPreference, colors: theme, shadowCard } = useAppTheme();
  const isDark = resolved === 'dark';
  const styles = useMemo(() => createStyles(theme, shadowCard), [theme, shadowCard]);

  return (
    <AnimatedPressable
      style={styles.btn}
      onPress={() => setPreference(isDark ? 'light' : 'dark')}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      accessibilityHint="Bascule entre thème clair et sombre. Pour suivre le système, ouvrir le menu profil puis Apparence."
    >
      {isDark ? (
        <Moon size={20} color={theme.teal700} strokeWidth={2.2} />
      ) : (
        <Sun size={20} color="#d97706" strokeWidth={2.2} />
      )}
    </AnimatedPressable>
  );
}
