import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';

type IconPressableProps = {
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  hitSlop?: number;
  disabled?: boolean;
};

/**
 * Zone tactile icône (éditer, supprimer, fermer…) avec feedback press.
 */
export function IconPressable({
  onPress,
  children,
  style,
  accessibilityLabel,
  hitSlop = 8,
  disabled,
}: IconPressableProps) {
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      pressScale={0.94}
      style={[styles.base, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
