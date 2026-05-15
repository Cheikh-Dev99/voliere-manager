import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Monitor, Moon, Sun } from 'lucide-react-native';

import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme, type ThemePreference } from '../../context/AppThemeContext';

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    lab: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: theme.slate500,
      textTransform: 'uppercase',
    },
    row: { flexDirection: 'row', gap: 6 },
    chip: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: theme.radiusMd,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.slate50,
    },
    chipOn: {
      borderColor: theme.teal600,
      backgroundColor: theme.teal50,
    },
    chipTxt: { fontSize: 12, fontWeight: '700', color: theme.slate700 },
    chipTxtOn: { color: theme.teal900 },
  });
}

export function ThemeAppearanceControl() {
  const { preference, setPreference, colors: theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const set = (p: ThemePreference) => () => setPreference(p);

  return (
    <View style={styles.wrap}>
      <Text style={styles.lab}>Apparence</Text>
      <View style={styles.row}>
        <Pressable
          onPress={set('light')}
          style={[styles.chip, preference === 'light' && styles.chipOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: preference === 'light' }}
        >
          <Sun size={16} color={theme.teal700} strokeWidth={2.2} />
          <Text style={[styles.chipTxt, preference === 'light' && styles.chipTxtOn]} numberOfLines={1}>
            Clair
          </Text>
        </Pressable>
        <Pressable
          onPress={set('system')}
          style={[styles.chip, preference === 'system' && styles.chipOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: preference === 'system' }}
        >
          <Monitor size={16} color={theme.teal700} strokeWidth={2.2} />
          <Text style={[styles.chipTxt, preference === 'system' && styles.chipTxtOn]} numberOfLines={1}>
            Auto
          </Text>
        </Pressable>
        <Pressable
          onPress={set('dark')}
          style={[styles.chip, preference === 'dark' && styles.chipOn]}
          accessibilityRole="button"
          accessibilityState={{ selected: preference === 'dark' }}
        >
          <Moon size={16} color={theme.teal700} strokeWidth={2.2} />
          <Text style={[styles.chipTxt, preference === 'dark' && styles.chipTxtOn]} numberOfLines={1}>
            Sombre
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
