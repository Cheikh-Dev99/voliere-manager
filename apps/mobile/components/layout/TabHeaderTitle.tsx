import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../constants/theme';

type IconComp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type Props = {
  Icon: IconComp;
  label: string;
};

/** Titre natif d’onglet : icône + libellé (aligné web / maquettes). */
export function TabHeaderTitle({ Icon, label }: Props) {
  return (
    <View style={styles.row}>
      <Icon size={22} color={theme.teal700} strokeWidth={2.2} />
      <Text style={styles.txt} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 260 },
  txt: { fontSize: 17, fontWeight: '700', color: theme.slate900 },
});
