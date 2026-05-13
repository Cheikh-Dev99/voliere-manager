import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme, shadowCard } from '../../constants/theme';

type EmptyStateCardProps = {
  icon: ReactNode;
  /** Couleur de fond derrière l’icône (défaut: teal50). */
  iconBackgroundColor?: string;
  title: string;
  hint?: string;
  /** Liste numérotée optionnelle (lignes courtes). */
  bullets?: string[];
  primaryLabel?: string;
  onPrimaryPress?: () => void;
};

export function EmptyStateCard({
  icon,
  iconBackgroundColor = theme.teal50,
  title,
  hint,
  bullets,
  primaryLabel,
  onPrimaryPress,
}: EmptyStateCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: iconBackgroundColor }]}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {bullets?.length ? (
        <View style={styles.list}>
          {bullets.map((line, i) => (
            <Text key={i} style={styles.bullet}>
              {i + 1}. {line}
            </Text>
          ))}
        </View>
      ) : null}
      {primaryLabel && onPrimaryPress ? (
        <Pressable
          onPress={onPrimaryPress}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
        >
          <Text style={styles.btnTxt}>{primaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    alignItems: 'center',
    ...shadowCard,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: theme.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.slate900,
    textAlign: 'center',
  },
  hint: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: theme.slate600,
    textAlign: 'center',
  },
  list: { marginTop: 14, alignSelf: 'stretch', gap: 8 },
  bullet: { fontSize: 13, color: theme.slate600, lineHeight: 18 },
  btn: {
    marginTop: 18,
    alignSelf: 'stretch',
    backgroundColor: theme.teal600,
    borderRadius: theme.radiusMd,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.92 },
  btnTxt: { color: theme.white, fontWeight: '800', fontSize: 15 },
});
