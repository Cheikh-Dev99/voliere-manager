import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';

import { theme } from '../../constants/theme';

/** Diamètre du bouton flottant. */
export const FLOATING_ADD_BUTTON_SIZE = 56;

/**
 * Espace à réserver en bas des listes (`contentContainerStyle.paddingBottom`) pour que
 * le dernier contenu ne passe pas sous le FAB + barre d’onglets.
 */
export const FLOATING_ADD_LIST_PADDING_BOTTOM = 108;

/** Hauteur approximative zone onglets + marge au-dessus du FAB. */
const TAB_BAR_CLEARANCE = 54;

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
  const insets = useSafeAreaInsets();
  const bottom = TAB_BAR_CLEARANCE + insets.bottom + bottomExtra;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && styles.fabPressed]}
      hitSlop={10}
    >
      <View style={styles.ring}>
        {icon ?? <Plus size={26} color={theme.white} strokeWidth={2.5} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
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
