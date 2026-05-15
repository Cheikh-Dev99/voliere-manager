import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';

type IconComp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type Props = {
  Icon: IconComp;
  label: string;
};

function createTabHeaderStyles(theme: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 260 },
    txt: { fontSize: 17, fontWeight: '700', color: theme.slate900 },
  });
}

/** Titre natif d’onglet : icône + libellé (aligné web / maquettes). */
export function TabHeaderTitle({ Icon, label }: Props) {
  const { colors: theme } = useAppTheme();
  const styles = useMemo(() => createTabHeaderStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      <Icon size={22} color={theme.teal700} strokeWidth={2.2} />
      <Text style={styles.txt} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
