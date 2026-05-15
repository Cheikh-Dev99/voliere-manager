import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { AnimatedPressable } from './AnimatedPressable';

type InteractiveListCardProps = {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel: string;
  accessibilityHint?: string;
  disabled?: boolean;
  cardStyle?: StyleProp<ViewStyle>;
  outerStyle?: StyleProp<ViewStyle>;
};

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    outer: { marginBottom: 12 },
    card: {
      borderRadius: theme.radiusLg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      padding: 14,
      overflow: 'hidden',
    },
  });
}

/**
 * Carte de liste cliquable — ombre + feedback press unifiés.
 */
export function InteractiveListCard({
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
  disabled,
  cardStyle,
  outerStyle,
}: InteractiveListCardProps) {
  const { colors: theme, shadowCard } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.outer, outerStyle]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <View style={[styles.card, shadowCard, cardStyle]}>{children}</View>
    </AnimatedPressable>
  );
}
