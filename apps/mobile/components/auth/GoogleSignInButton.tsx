import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import type { ThemeColors } from '../../constants/palettes';
import { GoogleLogo } from './GoogleLogo';

type GoogleSignInButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  theme: ThemeColors;
  style?: StyleProp<ViewStyle>;
};

export function GoogleSignInButton({
  label,
  onPress,
  disabled,
  busy,
  theme,
  style,
}: GoogleSignInButtonProps) {
  const styles = createStyles(theme);

  return (
    <Pressable
      style={[styles.btn, (disabled || busy) && styles.btnDisabled, style]}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator color={theme.slate700} />
      ) : (
        <View style={styles.inner}>
          <GoogleLogo size={20} />
          <Text style={styles.txt}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    btn: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: theme.minTap,
      borderRadius: theme.radiusMd,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      paddingHorizontal: 12,
    },
    btnDisabled: { opacity: 0.7 },
    inner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    txt: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.slate800,
    },
  });
}
