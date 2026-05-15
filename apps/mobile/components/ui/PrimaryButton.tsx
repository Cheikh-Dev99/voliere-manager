import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ShadowCardStyle, ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { AnimatedPressable } from './AnimatedPressable';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: 'solid' | 'outline';
};

function createPrimaryButtonStyles(theme: ThemeColors, shadowCard: ShadowCardStyle) {
  return StyleSheet.create({
    base: {
      borderRadius: theme.radiusMd,
      paddingVertical: 13,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    solid: { backgroundColor: theme.teal600, ...shadowCard },
    outline: {
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
    },
    disabled: { opacity: 0.55 },
    inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    txt: { color: theme.white, fontWeight: '800', fontSize: 15 },
    txtOutline: { color: theme.slate800 },
  });
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  variant = 'solid',
}: PrimaryButtonProps) {
  const { colors: theme, shadowCard } = useAppTheme();
  const styles = useMemo(() => createPrimaryButtonStyles(theme, shadowCard), [theme, shadowCard]);
  const outline = variant === 'outline';
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, outline ? styles.outline : styles.solid, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.inner}>
        {icon}
        <Text style={[styles.txt, outline && styles.txtOutline]}>{label}</Text>
      </View>
    </AnimatedPressable>
  );
}
