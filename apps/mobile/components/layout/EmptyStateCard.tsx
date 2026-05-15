import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ShadowCardStyle, ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { AnimatedPressable } from '../ui/AnimatedPressable';

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

function createEmptyStateStyles(theme: ThemeColors, shadowCard: ShadowCardStyle) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surfaceElevated,
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
    btnTxt: { color: theme.white, fontWeight: '800', fontSize: 15 },
  });
}

export function EmptyStateCard({
  icon,
  iconBackgroundColor,
  title,
  hint,
  bullets,
  primaryLabel,
  onPrimaryPress,
}: EmptyStateCardProps) {
  const { colors: theme, shadowCard, resolved } = useAppTheme();
  const styles = useMemo(
    () => createEmptyStateStyles(theme, shadowCard),
    [theme, shadowCard, resolved],
  );
  const iconBg = iconBackgroundColor ?? theme.teal50;

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>{icon}</View>
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
        <AnimatedPressable
          onPress={onPrimaryPress}
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel={primaryLabel}
        >
          <Text style={styles.btnTxt}>{primaryLabel}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}
