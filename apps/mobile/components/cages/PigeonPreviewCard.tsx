import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Pigeon } from '@shared/types';

import { usePigeonDisplayPhoto } from '../../hooks/usePigeonDisplayPhoto';
import type { ShadowCardStyle, ThemeColors } from '../../constants/palettes';
import { useThemedStyles } from '../../lib/useThemedStyles';
import { ageDepuisNaissance } from './cageDetailUtils';

type Props = {
  pigeon: Pigeon;
  roleLabel: 'Mâle' | 'Femelle';
  onPressCard?: () => void;
  onPressHealth: () => void;
  healthLinkLabel?: string;
};

export function PigeonPreviewCard({
  pigeon,
  roleLabel,
  onPressCard,
  onPressHealth,
  healthLinkLabel = 'Ouvrir le carnet de santé',
}: Props) {
  const styles = useThemedStyles(createStyles);
  const uri = usePigeonDisplayPhoto(pigeon);
  const roleColor = pigeon.sexe === 'MALE' ? '#38bdf8' : '#f472b6';

  const thumb = uri ? (
    <Image source={{ uri }} style={styles.thumb} accessibilityIgnoresInvertColors />
  ) : (
    <View style={styles.thumbPlaceholder}>
      <Text style={styles.thumbPhTxt}>Sans photo</Text>
    </View>
  );

  const details = (
    <View style={styles.textCol}>
      <Text style={[styles.role, { color: roleColor }]}>{roleLabel}</Text>
      <Text style={styles.line} numberOfLines={1}>
        <Text style={styles.muted}>Matricule </Text>
        <Text style={styles.strong}>{pigeon.matricule}</Text>
      </Text>
      <Text style={styles.line} numberOfLines={1}>
        <Text style={styles.muted}>Nom </Text>
        <Text style={styles.strong}>{pigeon.nom}</Text>
      </Text>
      <Text style={styles.lineMeta} numberOfLines={2}>
        <Text style={styles.muted}>Race </Text>
        {pigeon.race}
      </Text>
      <Text style={styles.lineMeta}>
        <Text style={styles.muted}>Âge </Text>
        {ageDepuisNaissance(pigeon.dateNaissance)}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      {onPressCard ? (
        <Pressable
          onPress={onPressCard}
          style={({ pressed }) => [styles.mainPress, pressed && styles.mainPressIn]}
          accessibilityRole="button"
          accessibilityLabel={`${roleLabel} ${pigeon.matricule}, ouvrir la fiche`}
        >
          {thumb}
          {details}
        </Pressable>
      ) : (
        <View style={styles.mainRow}>
          {thumb}
          {details}
        </View>
      )}
      <Pressable
        onPress={onPressHealth}
        style={styles.healthWrap}
        hitSlop={8}
        accessibilityRole="link"
        accessibilityLabel={healthLinkLabel}
      >
        <Text style={styles.healthLink}>{healthLinkLabel}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(theme: ThemeColors, shadowCard: ShadowCardStyle) {
  return StyleSheet.create({
    card: {
      borderRadius: theme.radiusLg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      padding: 12,
      ...shadowCard,
    },
    mainPress: { flexDirection: 'row', gap: 12 },
    mainPressIn: { opacity: 0.9 },
    mainRow: { flexDirection: 'row', gap: 12 },
    thumb: { width: 56, height: 56, borderRadius: theme.radiusMd, backgroundColor: theme.slate200 },
    thumbPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: theme.radiusMd,
      backgroundColor: theme.slate200,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    },
    thumbPhTxt: { fontSize: 10, fontWeight: '600', color: theme.slate500, textAlign: 'center' },
    textCol: { flex: 1, minWidth: 0 },
    role: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    line: { fontSize: 14, color: theme.slate800, marginBottom: 2 },
    lineMeta: { fontSize: 14, color: theme.slate600, marginBottom: 2 },
    muted: { color: theme.slate500 },
    strong: { fontWeight: '700', color: theme.slate900 },
    healthWrap: { marginTop: 10, paddingLeft: 68 },
    healthLink: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.teal700,
      textDecorationLine: 'underline',
    },
  });
}
