import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: 'solid' | 'outline';
};

export function PrimaryButton({
  label,
  onPress,
  disabled,
  icon,
  variant = 'solid',
}: PrimaryButtonProps) {
  const outline = variant === 'outline';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        outline ? styles.outline : styles.solid,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.inner}>
        {icon}
        <Text style={[styles.txt, outline && styles.txtOutline]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radiusMd,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: { backgroundColor: theme.teal600 },
  outline: {
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.border,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.9 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txt: { color: theme.white, fontWeight: '800', fontSize: 15 },
  txtOutline: { color: theme.slate800 },
});
