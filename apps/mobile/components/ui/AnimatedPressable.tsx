import type { ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { motionPress } from '../../constants/palettes';

type AnimatedPressableProps = PressableProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** Scale au press (défaut 0.97). */
  pressScale?: number;
  /** Opacité au press (défaut 0.92). */
  pressOpacity?: number;
};

/**
 * Pressable avec feedback visuel unifié (scale + opacité).
 */
export function AnimatedPressable({
  children,
  style,
  pressScale = motionPress.scale,
  pressOpacity = motionPress.opacity,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => {
        const base = typeof style === 'function' ? style({ pressed }) : style;
        const feedback =
          pressed && !disabled
            ? { opacity: pressOpacity, transform: [{ scale: pressScale }] as const }
            : undefined;
        return [base, feedback];
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
