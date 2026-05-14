import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bird, ChevronDown, Download, Pencil, Trash2, X } from 'lucide-react-native';

import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import { supprimerPigeon } from '@shared/services/pigeonsService';
import type { Pigeon, PigeonStatut } from '@shared/types';
import { buildPigeonIdsInActifsCouples, libelleStatutListePigeon } from '@shared/utils/pigeonCoupleDisplay';
import { buildPigeonsCsvDelimited } from '@shared/utils/pigeonCsv';

import { PigeonPhotoAvatar } from '../../../components/pigeons/PigeonPhotoAvatar';
import { EmptyStateCard } from '../../../components/layout/EmptyStateCard';
import { PageHeader } from '../../../components/layout/PageHeader';
import { TabHeaderTitle } from '../../../components/layout/TabHeaderTitle';
import {
  FloatingAddButton,
  FLOATING_ADD_LIST_PADDING_BOTTOM,
} from '../../../components/ui/FloatingAddButton';
import { SearchField } from '../../../components/ui/SearchField';
import { AppLoadingView } from '../../../components/ui/AppLoadingView';
import { theme, shadowCard } from '../../../constants/theme';
import { appFeedback } from '../../../lib/appFeedback';
import { clearPigeonLocalPhoto } from '../../../utils/localPigeonPhoto';
import { shareUtf8TextFile } from '../../../utils/shareUtf8TextFile';

const STATUT_LABEL: Record<PigeonStatut, string> = {
  ACTIF: 'Actif',
  VENDU: 'Vendu',
  MORT: 'Mort',
  PERDU: 'Perdu',
};

/** Filtre dérivé : actif dans un couple actif (pas une valeur `statut` Firestore). */
const FILTRE_EN_COUPLE = 'EN_COUPLE' as const;

/** Filtre : fiches archivées (`deletedAt`). */
const FILTRE_ARCHIVE = 'ARCHIVE' as const;

type FiltreStatutTab = 'ALL' | PigeonStatut | typeof FILTRE_EN_COUPLE | typeof FILTRE_ARCHIVE;

const STATUT_CHIPS: FiltreStatutTab[] = [
  'ALL',
  'ACTIF',
  FILTRE_EN_COUPLE,
  'VENDU',
  'MORT',
  'PERDU',
  FILTRE_ARCHIVE,
];

function libelleChipStatut(st: FiltreStatutTab): string {
  if (st === 'ALL') return 'Tous';
  if (st === FILTRE_EN_COUPLE) return 'En couple';
  if (st === FILTRE_ARCHIVE) return 'Archivés';
  return STATUT_LABEL[st];
}

export default function PigeonsTabScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <TabHeaderTitle Icon={Bird} label="Pigeons" />,
    });
  }, [navigation]);
  const { pigeons, archivedPigeons, loading, error, stats } = usePigeons(false);
  const { couples, loading: couplesLoading, error: couplesError } = useCouples(true);
  const listLoading = loading || couplesLoading;
  const listError = error ?? couplesError;

  const hasAnyPigeon = pigeons.length + archivedPigeons.length > 0;

  const pigeonIdsEnCouplesActifs = useMemo(
    () => buildPigeonIdsInActifsCouples(couples),
    [couples],
  );

  const [query, setQuery] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<FiltreStatutTab>('ALL');
  const [statutMenuOpen, setStatutMenuOpen] = useState(false);

  const listBase = useMemo(
    () => (filtreStatut === FILTRE_ARCHIVE ? archivedPigeons : pigeons),
    [filtreStatut, archivedPigeons, pigeons],
  );

  const qNorm = query.trim().toLowerCase();

  const rows = useMemo(() => {
    return listBase.filter((p) => {
      if (filtreStatut !== 'ALL' && filtreStatut !== FILTRE_ARCHIVE) {
        if (filtreStatut === FILTRE_EN_COUPLE) {
          if (!(p.statut === 'ACTIF' && pigeonIdsEnCouplesActifs.has(p.id))) return false;
        } else if (p.statut !== filtreStatut) return false;
      }
      if (!qNorm) return true;
      const hay = [p.matricule, p.nom, p.race, p.notes].join(' ').toLowerCase();
      return hay.includes(qNorm);
    });
  }, [listBase, filtreStatut, qNorm, pigeonIdsEnCouplesActifs]);

  const handleExportCsv = useCallback(async () => {
    if (rows.length === 0) {
      appFeedback.alert('Export CSV', 'Aucune ligne à exporter pour la sélection actuelle.');
      return;
    }
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const body = buildPigeonsCsvDelimited(rows, pigeonIdsEnCouplesActifs);
      await shareUtf8TextFile(`pigeons-export-${stamp}.csv`, body);
    } catch (e) {
      appFeedback.error('Export CSV', e instanceof Error ? e.message : 'Export impossible.');
    }
  }, [rows, pigeonIdsEnCouplesActifs]);

  const confirmArchivePigeon = useCallback((p: Pigeon) => {
    if (p.deletedAt) return;
    appFeedback.alert(
      'Archiver le pigeon',
      `Retirer ${p.matricule} — ${p.nom} de l’effectif ? La fiche reste consultable via le filtre « Archivés ». Impossible s’il a des descendants.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await supprimerPigeon(p.id);
                await clearPigeonLocalPhoto(p.id);
                appFeedback.success('Pigeon archivé', 'Il n’apparaît plus dans l’effectif actif.');
              } catch (e) {
                appFeedback.error('Archivage', e instanceof Error ? e.message : 'Archivage impossible.');
              }
            })();
          },
        },
      ],
    );
  }, []);

  const header = (
    <View style={styles.header}>
      <PageHeader description="Chaque pigeon a un matricule unique (bague). Touche une carte pour la fiche. Export CSV (lignes affichées) : bouton ci-dessous. Archiver : icône corbeille sur la carte (non archivée). Nouveau pigeon : bouton + en bas à droite. Fiches retirées : menu Statut → Archivés." />

      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Matricule, nom ou race…"
      />

      <Text style={styles.lab}>Statut</Text>
      <Pressable
        onPress={() => setStatutMenuOpen(true)}
        style={styles.dropdownTrigger}
        accessibilityRole="button"
        accessibilityLabel="Filtrer par statut"
        accessibilityHint={`Valeur : ${libelleChipStatut(filtreStatut)}. Ouvre la liste des statuts.`}
      >
        <Text style={styles.dropdownValue} numberOfLines={1}>
          {libelleChipStatut(filtreStatut)}
        </Text>
        <ChevronDown size={22} color={theme.slate500} strokeWidth={2.2} />
      </Pressable>
      <Text style={styles.meta}>
        Actifs {stats.actifs} · Total {stats.total}
      </Text>
      <Pressable
        style={styles.exportBtn}
        onPress={() => void handleExportCsv()}
        accessibilityRole="button"
        accessibilityLabel="Exporter les pigeons affichés en CSV"
        accessibilityHint="Génère un fichier texte avec les lignes visibles (filtres et recherche appliqués)."
      >
        <Download size={18} color={theme.teal700} strokeWidth={2.2} />
        <Text style={styles.exportBtnTxt}>Exporter CSV (affichage)</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      {listLoading ? (
        <View style={styles.center}>
          <AppLoadingView
            variant="embedded"
            loadingContext="default"
            message="Chargement des pigeons…"
            subtitle="Effectif, couples et archivés."
          />
        </View>
      ) : listError ? (
        <Text style={styles.err}>{listError}</Text>
      ) : (
        <>
          <FlatList
            data={rows}
            numColumns={2}
            keyExtractor={(p) => p.id}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.list, { paddingBottom: FLOATING_ADD_LIST_PADDING_BOTTOM }]}
            ListHeaderComponent={
              <>
                {header}
                {!rows.length ? (
                  <EmptyStateCard
                    icon={<Bird size={28} color={theme.teal700} strokeWidth={2} />}
                    title={hasAnyPigeon ? 'Aucun pigeon pour cette sélection' : "Aucun pigeon pour l'instant"}
                    hint={
                      hasAnyPigeon
                        ? 'Essaie une autre recherche ou choisis « Archivés » dans le menu Statut pour voir les fiches archivées.'
                        : 'Enregistre ton premier pigeon avec son matricule, sexe, race et date de naissance.'
                    }
                    bullets={
                      hasAnyPigeon
                        ? undefined
                        : [
                            'Touche le bouton rond + vert en bas à droite.',
                            'Ensuite : couples, reproductions, etc. depuis le web ou l’app.',
                          ]
                    }
                  />
                ) : null}
              </>
            }
            renderItem={({ item }) => {
            const isArchived = Boolean(item.deletedAt);
            const enCouple =
              !isArchived && item.statut === 'ACTIF' && pigeonIdsEnCouplesActifs.has(item.id);
            const libelleStatut = libelleStatutListePigeon(item, pigeonIdsEnCouplesActifs, STATUT_LABEL);
            const pillBox = [
              styles.pill,
              isArchived
                ? styles.pillArchive
                : enCouple
                  ? styles.pillCouple
                  : item.statut === 'ACTIF'
                    ? styles.pillActif
                    : item.statut === 'VENDU'
                      ? styles.pillVendu
                      : item.statut === 'MORT'
                        ? styles.pillMort
                        : styles.pillPerdu,
            ];
            const pillText = [
              styles.pillTxt,
              isArchived
                ? styles.pillTxtArchive
                : enCouple
                  ? styles.pillTxtCouple
                  : item.statut === 'ACTIF'
                    ? styles.pillTxtActif
                    : item.statut === 'VENDU'
                      ? styles.pillTxtVendu
                      : item.statut === 'MORT'
                        ? styles.pillTxtMort
                        : styles.pillTxtPerdu,
            ];
            return (
              <View style={[styles.card, shadowCard]}>
                <Pressable
                  style={styles.cardMainPress}
                  onPress={() => router.push(`/(app)/pigeon/${item.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Fiche pigeon ${item.matricule}`}
                >
                  <View style={styles.cardInner}>
                    <View style={styles.cardThumbRow}>
                      <PigeonPhotoAvatar pigeon={item} size="sm" />
                    </View>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.mat} numberOfLines={1}>
                        {item.matricule}
                      </Text>
                      <View style={pillBox}>
                        <Text style={pillText} numberOfLines={1}>
                          {libelleStatut}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.nom} numberOfLines={2}>
                      {item.nom}
                    </Text>
                    <Text style={styles.meta2} numberOfLines={2}>
                      {item.race} · {item.sexe}
                    </Text>
                  </View>
                </Pressable>
                {!isArchived ? (
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.cardActBtn}
                      onPress={() => router.push(`/(app)/pigeon/${item.id}/modifier`)}
                      accessibilityRole="button"
                      accessibilityLabel={`Modifier ${item.matricule}`}
                    >
                      <Pencil size={18} color={theme.teal700} strokeWidth={2.2} />
                    </Pressable>
                    <Pressable
                      style={styles.cardActBtn}
                      onPress={() => confirmArchivePigeon(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Archiver ${item.matricule}`}
                    >
                      <Trash2 size={18} color={theme.slate500} strokeWidth={2.2} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          }}
          />
          <Modal
            visible={statutMenuOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setStatutMenuOpen(false)}
          >
            <View style={styles.filterModalRoot}>
              <Pressable
                style={styles.filterModalBackdrop}
                onPress={() => setStatutMenuOpen(false)}
                accessibilityLabel="Fermer le menu"
              />
              <View
                style={[
                  styles.filterSheet,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                ]}
              >
                <View style={styles.filterSheetHeader}>
                  <Text style={styles.filterSheetTitle}>Statut</Text>
                  <Pressable
                    onPress={() => setStatutMenuOpen(false)}
                    hitSlop={12}
                    accessibilityLabel="Fermer"
                  >
                    <X size={22} color={theme.slate600} strokeWidth={2.2} />
                  </Pressable>
                </View>
                {STATUT_CHIPS.map((st) => {
                  const sel = filtreStatut === st;
                  return (
                    <Pressable
                      key={st}
                      style={[styles.filterRow, sel && styles.filterRowOn]}
                      onPress={() => {
                        setFiltreStatut(st);
                        setStatutMenuOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                    >
                      <Text style={[styles.filterRowTxt, sel && styles.filterRowTxtOn]}>
                        {libelleChipStatut(st)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Modal>
          {filtreStatut !== FILTRE_ARCHIVE ? (
            <FloatingAddButton
              onPress={() => router.push('/(app)/pigeon/nouveau')}
              accessibilityLabel="Nouveau pigeon"
              icon={<Bird size={24} color={theme.white} strokeWidth={2.4} />}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  header: { paddingHorizontal: theme.screenPadding, paddingBottom: 8, gap: 12 },
  lab: { fontSize: 13, fontWeight: '700', color: theme.slate800, marginBottom: 4 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    backgroundColor: theme.white,
    minHeight: 48,
  },
  dropdownValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.slate900,
  },
  filterModalRoot: { flex: 1, justifyContent: 'flex-end' },
  filterModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  filterSheet: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: '55%',
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  filterSheetTitle: { fontSize: 17, fontWeight: '800', color: theme.slate900 },
  filterRow: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: theme.radiusMd,
  },
  filterRowOn: { backgroundColor: theme.teal50 },
  filterRowTxt: { fontSize: 16, fontWeight: '600', color: theme.slate800 },
  filterRowTxtOn: { color: theme.teal900, fontWeight: '700' },
  meta: { fontSize: 13, color: theme.slate600, fontWeight: '600' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.teal600,
    backgroundColor: theme.teal50,
  },
  exportBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.teal900,
  },
  list: { paddingHorizontal: theme.screenPadding, paddingBottom: 28 },
  /** Espace entre les deux cartes d’une même ligne (FlatList `numColumns={2}`). */
  gridRow: {
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    maxWidth: '50%',
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  cardMainPress: { width: '100%' },
  cardInner: { gap: 6 },
  cardThumbRow: { alignItems: 'center', marginBottom: 2 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  mat: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '800', color: theme.slate900 },
  nom: { fontSize: 14, color: theme.slate700, marginTop: 2 },
  meta2: { fontSize: 12, color: theme.slate500, marginTop: 2 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  cardActBtn: {
    padding: 8,
    borderRadius: theme.radiusMd,
  },
  pill: {
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  /** Actif seul : couleur principale de l’app (teal). */
  pillActif: {
    backgroundColor: theme.teal50,
    borderColor: theme.teal600,
  },
  pillTxtActif: { color: theme.teal900 },
  /** Vendu : orange. */
  pillVendu: {
    backgroundColor: '#ffedd5',
    borderColor: '#fb923c',
  },
  pillTxtVendu: { color: '#9a3412' },
  /** Mort : gris. */
  pillMort: {
    backgroundColor: theme.slate100,
    borderColor: theme.slate200,
  },
  pillTxtMort: { color: theme.slate600 },
  /** Perdu : ambre (distinct du vendu). */
  pillPerdu: {
    backgroundColor: theme.amber50,
    borderColor: '#f59e0b',
  },
  pillTxtPerdu: { color: theme.amber950 },
  pillCouple: {
    backgroundColor: '#ffe4e6',
    borderColor: '#fda4af',
  },
  pillTxt: { fontSize: 9, fontWeight: '800' },
  pillTxtCouple: { color: '#9f1239' },
  pillArchive: {
    backgroundColor: theme.slate200,
    borderColor: theme.slate500,
  },
  pillTxtArchive: { color: theme.slate800 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { marginTop: 8, color: theme.slate500 },
  err: { color: theme.red600, padding: 16 },
});
