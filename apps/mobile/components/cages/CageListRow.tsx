import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bird, Pencil, Trash2 } from 'lucide-react-native';

import type { Cage, Couple, Pigeon } from '@shared/types';

import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { appFeedback } from '../../lib/appFeedback';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { IconPressable } from '../ui/IconPressable';
import { cageStatutVisualFor } from './cageStatutTheme';

type Props = {
  cage: Cage;
  pigeon: Pigeon | null;
  male: Pigeon | null;
  femelle: Pigeon | null;
  /** Libellé métier du statut (ex. « 1 pigeon »). */
  statutLibelle: string;
  onPress: () => void;
  onEditPress: () => void;
  /** Uniquement pour cage libre : confirmation gérée par le parent. */
  onDeletePress?: () => void;
  /** Mode sélection multiple (cages libres uniquement). */
  selectionMode?: boolean;
  selected?: boolean;
};

function formatOccupancy(
  cage: Cage,
  pigeon: Pigeon | null,
  male: Pigeon | null,
  femelle: Pigeon | null,
): string {
  if (cage.statut === 'LIBRE') return 'Aucun occupant · cage libre';
  if (cage.statut === 'OCCUPE_PIGEON') {
    if (!pigeon) return '1 pigeon (fiche non chargée)';
    const sexe = pigeon.sexe === 'MALE' ? 'Mâle' : 'Femelle';
    return `${sexe} · ${pigeon.matricule} — ${pigeon.nom} · ${pigeon.race}`;
  }
  if (cage.statut === 'OCCUPE_COUPLE') {
    if (male && femelle) {
      return `Couple · ${male.matricule} (${male.nom}) + ${femelle.matricule} (${femelle.nom})`;
    }
    return 'Couple affecté à cette cage';
  }
  return '—';
}

function createCageListRowStyles(theme: ThemeColors, resolved: 'light' | 'dark') {
  const selectRailBg = resolved === 'dark' ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.65)';
  const actionRowBg = resolved === 'dark' ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.55)';

  return StyleSheet.create({
    wrap: {
      borderRadius: theme.radiusLg,
      borderWidth: 1,
      overflow: 'hidden',
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    wrapSelected: {
      borderColor: theme.teal600,
      borderWidth: 2,
    },
    selectRail: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: selectRailBg,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: theme.border,
    },
    selectDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: theme.slate500,
      backgroundColor: theme.surfaceElevated,
    },
    selectDotOn: {
      borderColor: theme.teal600,
      backgroundColor: theme.teal100,
    },
    bodyColumn: {
      flex: 1,
      minWidth: 0,
    },
    main: {
      width: '100%',
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    titleBlock: { flex: 1, minWidth: 0 },
    ref: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.slate600,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    nomCage: {
      marginTop: 4,
      fontSize: 17,
      fontWeight: '800',
      color: theme.slate900,
    },
    badge: {
      flexShrink: 0,
      maxWidth: '42%',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radiusMd,
      borderWidth: 1,
    },
    badgeTxt: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
    occRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 10,
    },
    occTxt: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      color: theme.slate800,
      lineHeight: 20,
    },
    metaRow: { marginTop: 8 },
    meta: { fontSize: 13, color: theme.slate600, fontWeight: '600' },
    descPreview: {
      marginTop: 8,
      fontSize: 12,
      color: theme.slate500,
      lineHeight: 17,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      backgroundColor: actionRowBg,
    },
    iconBtn: {
      minWidth: theme.minTap,
      minHeight: theme.minTap,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radiusMd,
      borderWidth: 1,
      borderColor: theme.teal100,
      backgroundColor: theme.surfaceElevated,
    },
    iconBtnDanger: {
      minWidth: theme.minTap,
      minHeight: theme.minTap,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radiusMd,
      borderWidth: 1,
      borderColor: '#fecaca',
      backgroundColor: theme.surfaceElevated,
    },
  });
}

export function CageListRow({
  cage,
  pigeon,
  male,
  femelle,
  statutLibelle,
  onPress,
  onEditPress,
  onDeletePress,
  selectionMode = false,
  selected = false,
}: Props) {
  const { colors: theme, shadowCard, resolved } = useAppTheme();
  const styles = useMemo(() => createCageListRowStyles(theme, resolved), [theme, resolved]);
  const st = cageStatutVisualFor(resolved, cage.statut);
  const desc = (cage.description ?? '').trim();
  const vol = cage.voliereCode ?? 'A';
  const sup = Number(cage.superficie);
  const supTxt = Number.isFinite(sup) && sup > 0 ? `${sup} m²` : 'Superficie non renseignée';
  const occupancy = formatOccupancy(cage, pigeon, male, femelle);

  const openDescription = () => {
    if (!desc) return;
    appFeedback.info(`Cage ${cage.numero}`, desc);
  };

  return (
    <View
      style={[
        styles.wrap,
        shadowCard,
        {
          borderColor: st.border,
          backgroundColor: st.cardBg,
          borderLeftWidth: 4,
          borderLeftColor: st.dot,
        },
        selectionMode && selected ? styles.wrapSelected : null,
      ]}
    >
      {selectionMode && cage.statut === 'LIBRE' ? (
        <View style={styles.selectRail} accessibilityElementsHidden>
          <View style={[styles.selectDot, selected && styles.selectDotOn]} />
        </View>
      ) : null}
      <View style={styles.bodyColumn}>
        <AnimatedPressable
          onPress={onPress}
          onLongPress={desc ? openDescription : undefined}
          delayLongPress={450}
          style={styles.main}
          accessibilityRole="button"
          accessibilityLabel={`Cage ${vol} ${cage.numero}, ${statutLibelle}`}
          accessibilityHint={
            selectionMode && cage.statut === 'LIBRE'
              ? 'Touche pour sélectionner ou désélectionner cette cage libre.'
              : desc
                ? 'Appui long pour lire la description complète.'
                : undefined
          }
        >
          <View style={styles.topRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.ref} numberOfLines={1}>
                {vol} · {cage.numero}
              </Text>
              <Text style={styles.nomCage} numberOfLines={2}>
                {cage.nom?.trim() ? cage.nom : 'Sans nom'}
              </Text>
            </View>
            <View style={[styles.badge, { borderColor: st.border, backgroundColor: theme.surfaceHighlight }]}>
              <Text style={[styles.badgeTxt, { color: st.birdColor }]} numberOfLines={1}>
                {statutLibelle}
              </Text>
            </View>
          </View>

          <View style={styles.occRow}>
            {(cage.statut === 'OCCUPE_PIGEON' || cage.statut === 'OCCUPE_COUPLE') && (
              <Bird size={16} color={st.birdColor} strokeWidth={2.2} />
            )}
            <Text style={styles.occTxt} numberOfLines={3}>
              {occupancy}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.meta}>{supTxt}</Text>
          </View>

          {desc ? (
            <Text style={styles.descPreview} numberOfLines={3}>
              {desc}
            </Text>
          ) : null}
        </AnimatedPressable>

        <View style={styles.actionRow}>
          <IconPressable
            onPress={onEditPress}
            style={styles.iconBtn}
            accessibilityLabel="Modifier la cage"
          >
            <Pencil size={20} color={theme.teal700} strokeWidth={2.2} />
          </IconPressable>
          {onDeletePress ? (
            <IconPressable
              onPress={onDeletePress}
              style={styles.iconBtnDanger}
              accessibilityLabel="Supprimer la cage"
            >
              <Trash2 size={20} color={theme.red600} strokeWidth={2.2} />
            </IconPressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
