import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';

import type { ShadowStyle, ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { AnimatedPressable } from './AnimatedPressable';

/** Diamètre du bouton flottant. */
export const FLOATING_ADD_BUTTON_SIZE = 56;

/**
 * Espace à réserver en bas des listes (`contentContainerStyle.paddingBottom`) pour que
 * le dernier contenu ne passe pas sous le FAB + barre d’onglets.
 */
export const FLOATING_ADD_LIST_PADDING_BOTTOM = 108;

/** Hauteur approximative zone onglets + marge au-dessus du FAB. */
const TAB_BAR_CLEARANCE = 54;

function createFabStyles(theme: ThemeColors, floatingShadow: ShadowStyle) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      right: theme.screenPadding,
      width: FLOATING_ADD_BUTTON_SIZE,
      height: FLOATING_ADD_BUTTON_SIZE,
      borderRadius: FLOATING_ADD_BUTTON_SIZE / 2,
      backgroundColor: theme.teal600,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      ...floatingShadow,
    },
    ring: {
      width: FLOATING_ADD_BUTTON_SIZE - 4,
      height: FLOATING_ADD_BUTTON_SIZE - 4,
      borderRadius: (FLOATING_ADD_BUTTON_SIZE - 4) / 2,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

type FloatingAddButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  /** Icône (défaut : +). */
  icon?: ReactNode;
  /** Décale le FAB vers le haut (ex. clavier ouvert). */
  bottomExtra?: number;
};

/**
 * Bouton d’action principale flottant, circulaire, bas-droite (pattern FAB).
 * Pensé pour les écrans d’onglets avec barre de navigation en bas.
 */
export function FloatingAddButton({
  onPress,
  accessibilityLabel,
  icon,
  bottomExtra = 0,
}: FloatingAddButtonProps) {
  const { colors: theme, shadows } = useAppTheme();
  const styles = useMemo(() => createFabStyles(theme, shadows.floating), [theme, shadows.floating]);
  const insets = useSafeAreaInsets();
  const bottom = TAB_BAR_CLEARANCE + insets.bottom + bottomExtra;

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.fab, { bottom }]}
      hitSlop={10}
      pressScale={0.96}
    >
      <View style={styles.ring}>
        {icon ?? <Plus size={26} color={theme.white} strokeWidth={2.5} />}
      </View>
    </AnimatedPressable>
  );
}
