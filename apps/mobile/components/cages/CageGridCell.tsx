import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bird, CircleAlert, GripVertical } from 'lucide-react-native';

import type { Cage, Pigeon } from '@shared/types';

import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { appFeedback } from '../../lib/appFeedback';
import { cageStatutCenterText, cageStatutVisualFor } from './cageStatutTheme';

type Props = {
  cage: Cage;
  pigeon: Pigeon | null;
  male: Pigeon | null;
  femelle: Pigeon | null;
  onPress: () => void;
  /** Poignée : cage seule avec `pigeonId` (même si la fiche pigeon n’est pas encore en cache). */
  onDragHandlePress?: () => void;
};

function createGridStyles(theme: ThemeColors, resolved: 'light' | 'dark') {
  const shadowOpacity = resolved === 'dark' ? 0.22 : 0.05;
  const descBg = resolved === 'dark' ? 'rgba(51,65,85,0.92)' : 'rgba(255,255,255,0.9)';

  return StyleSheet.create({
    wrap: {
      flex: 1,
      flexDirection: 'row',
      minHeight: 128,
      borderRadius: 12,
      borderWidth: 2,
      marginBottom: 0,
      overflow: 'hidden',
    },
    shadowSm: {
      shadowColor: '#0f172a',
      shadowOpacity,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: resolved === 'dark' ? 3 : 1,
    },
    main: {
      padding: 12,
      justifyContent: 'flex-start',
      minWidth: 0,
    },
    mainFull: { flex: 1 },
    mainWithHandle: { flex: 1 },
    mainPressed: { opacity: 0.94 },
    descBtn: {
      position: 'absolute',
      left: 8,
      bottom: 8,
      zIndex: 2,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: descBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(251, 146, 60, 0.35)',
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    numero: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: theme.slate900,
      letterSpacing: -0.2,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 4,
    },
    libreBody: {
      flex: 1,
      minHeight: 56,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 4,
    },
    libreLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.slate600,
    },
    birdsWrap: {
      marginTop: 8,
      minHeight: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    birdRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    centerLbl: {
      marginTop: 4,
      textAlign: 'center',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
      color: theme.slate600,
    },
    meta: { marginTop: 2, alignItems: 'center' },
    metaWithDesc: { paddingBottom: 26 },
    mat: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.slate700,
      textAlign: 'center',
    },
    nom: {
      fontSize: 10,
      lineHeight: 14,
      color: theme.slate500,
      textAlign: 'center',
      marginTop: 2,
    },
    handle: {
      minWidth: 44,
      borderLeftWidth: 1,
      borderLeftColor: 'rgba(254, 205, 211, 0.85)',
      backgroundColor: 'rgba(255, 228, 230, 0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
    },
    handlePressed: { backgroundColor: 'rgba(254, 205, 211, 0.65)' },
  });
}

export function CageGridCell({
  cage,
  pigeon,
  male,
  femelle,
  onPress,
  onDragHandlePress,
}: Props) {
  const { colors: theme, resolved } = useAppTheme();
  const styles = useMemo(() => createGridStyles(theme, resolved), [theme, resolved]);
  const st = cageStatutVisualFor(resolved, cage.statut);
  const center = cageStatutCenterText[cage.statut] ?? '';
  const desc = (cage.description ?? '').trim();
  const soloPigeonId = cage.statut === 'OCCUPE_PIGEON' ? cage.pigeonId : null;
  const showHandle = Boolean(onDragHandlePress && soloPigeonId);
  const isLibre = cage.statut === 'LIBRE';

  const openDescription = () => {
    if (!desc) return;
    appFeedback.info(`Cage ${cage.numero}`, desc);
  };

  const birds =
    cage.statut === 'OCCUPE_COUPLE' ? (
      <View style={styles.birdRow}>
        <Bird size={20} color={st.birdColor} strokeWidth={2.2} />
        <Bird size={20} color={st.birdColor} strokeWidth={2.2} />
      </View>
    ) : cage.statut === 'OCCUPE_PIGEON' ? (
      <View style={styles.birdRow}>
        <Bird size={20} color={st.birdColor} strokeWidth={2.2} />
      </View>
    ) : null;

  return (
    <View style={[styles.wrap, { borderColor: st.border, backgroundColor: st.cardBg }, styles.shadowSm]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.main,
          showHandle ? styles.mainWithHandle : styles.mainFull,
          pressed && styles.mainPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Cage ${cage.numero}, ${center}`}
      >
        {desc ? (
          <Pressable
            onPress={openDescription}
            style={styles.descBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`Description cage ${cage.numero}`}
            accessibilityRole="button"
          >
            <CircleAlert size={14} color="#ea580c" strokeWidth={2.2} />
          </Pressable>
        ) : null}

        <View style={styles.topRow}>
          <Text style={styles.numero} numberOfLines={1}>
            {cage.numero}
          </Text>
          <View style={[styles.dot, { backgroundColor: st.dot }]} accessibilityLabel={`Statut : ${center}`} />
        </View>

        {isLibre ? (
          <View style={styles.libreBody}>
            <Text style={styles.libreLabel}>Libre</Text>
          </View>
        ) : (
          <>
            <View style={styles.birdsWrap}>{birds}</View>
            <Text style={styles.centerLbl}>{center}</Text>
            {cage.statut === 'OCCUPE_PIGEON' && soloPigeonId ? (
              <View style={[styles.meta, desc && styles.metaWithDesc]}>
                <Text style={styles.mat} numberOfLines={1}>
                  {pigeon?.matricule ?? '—'}
                </Text>
                <Text style={styles.nom} numberOfLines={1}>
                  {pigeon?.nom ?? ''}
                </Text>
              </View>
            ) : null}
            {cage.statut === 'OCCUPE_COUPLE' && male && femelle ? (
              <View style={[styles.meta, desc && styles.metaWithDesc]}>
                <Text style={styles.mat} numberOfLines={1}>
                  {male.matricule} · {femelle.matricule}
                </Text>
                <Text style={styles.nom} numberOfLines={1}>
                  {male.nom} / {femelle.nom}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </Pressable>

      {showHandle ? (
        <Pressable
          onPress={onDragHandlePress}
          style={({ pressed }) => [styles.handle, pressed && styles.handlePressed]}
          accessibilityRole="button"
          accessibilityLabel="Former un couple : touche une cage cible surlignée"
          accessibilityHint="Touche d’abord cette poignée, puis une autre cage occupée par un pigeon du sexe opposé."
        >
          <GripVertical size={20} color="#9f1239" style={{ opacity: 0.8 }} />
        </Pressable>
      ) : null}
    </View>
  );
}
