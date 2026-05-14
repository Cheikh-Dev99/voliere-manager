import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, FilterX, ScrollText, Trash2 } from 'lucide-react-native';

import {
  deleteAllCageOccupancyEvents,
  deleteCageOccupancyEvent,
  fetchCageOccupancyEvents,
  obtenirCage,
} from '@shared/services/cagesService';
import type { CageOccupancyEvent, CageOccupancyKind } from '@shared/types';

import { appFeedback } from '../../../../lib/appFeedback';
import { theme, shadowCard } from '../../../../constants/theme';
import { formatEventTime } from '../../../../components/cages/cageDetailUtils';

const OCC_KIND_LABELS: Record<CageOccupancyKind, string> = {
  assign_pigeon: 'Affectation (1 pigeon)',
  assign_couple: 'Affectation (couple)',
  release: 'Libération',
  move_pigeon_out: 'Déplacement pigeon (sortie)',
  move_pigeon_in: 'Déplacement pigeon (entrée)',
  move_couple_out: 'Déplacement couple (sortie)',
  move_couple_in: 'Déplacement couple (entrée)',
};

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Non précisé' },
  { value: 'VENTE', label: 'Vente / sortie définitive' },
  { value: 'AUTRE_CAGE', label: 'Autre cage (hors couple)' },
  { value: 'MISE_EN_COUPLE', label: 'Mise en couple ailleurs' },
  { value: 'SOIN', label: 'Soin / isolement' },
  { value: 'NETTOYAGE', label: 'Nettoyage / rotation' },
  { value: 'AUTRE', label: 'Autre' },
];

function reasonLines(code: string | null, detail: string | null): string | null {
  const opt = code ? REASON_OPTIONS.find((o) => o.value === code) : null;
  const base = opt?.label ?? '';
  const d = detail?.trim() ?? '';
  if (!base && !d) return null;
  return [base, d].filter(Boolean).join(' — ');
}

function eventTimestampMs(ev: CageOccupancyEvent): number {
  try {
    const d = ev.createdAt?.toDate?.();
    return d instanceof Date ? d.getTime() : 0;
  } catch {
    return 0;
  }
}

function startOfDayMs(yyyyMmDd: string): number | null {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt.getTime();
}

function endOfDayMs(yyyyMmDd: string): number | null {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999);
  return Number.isNaN(dt.getTime()) ? null : dt.getTime();
}

const KIND_OPTIONS: Array<{ id: 'ALL' | CageOccupancyKind; label: string }> = [
  { id: 'ALL', label: 'Tous les types' },
  ...(Object.keys(OCC_KIND_LABELS) as CageOccupancyKind[]).map((k) => ({
    id: k,
    label: OCC_KIND_LABELS[k],
  })),
];

export default function CageHistoriqueScreen() {
  const { cageId: cageIdParam } = useLocalSearchParams<{ cageId: string }>();
  const cageId = Array.isArray(cageIdParam) ? cageIdParam[0] : cageIdParam;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [cageLabel, setCageLabel] = useState('');
  const [events, setEvents] = useState<CageOccupancyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | CageOccupancyKind>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [kindModalOpen, setKindModalOpen] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);

  const reload = useCallback(async () => {
    if (!cageId) {
      setLoadError('Identifiant manquant.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [c, rows] = await Promise.all([obtenirCage(cageId), fetchCageOccupancyEvents(cageId, 500)]);
      if (c) setCageLabel(`${c.voliereCode ?? 'A'} · ${c.numero}`);
      else setCageLabel('');
      setEvents(rows);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Chargement impossible');
      setEvents([]);
      setCageLabel('');
    } finally {
      setLoading(false);
    }
  }, [cageId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = startOfDayMs(dateFrom);
    const toMs = endOfDayMs(dateTo);
    return events.filter((ev) => {
      if (kindFilter !== 'ALL' && ev.kind !== kindFilter) return false;
      const t = eventTimestampMs(ev);
      if (fromMs != null && t < fromMs) return false;
      if (toMs != null && t > toMs) return false;
      if (!q) return true;
      const hay = [
        ev.summary,
        ev.reasonDetail ?? '',
        OCC_KIND_LABELS[ev.kind] ?? ev.kind,
        ev.pigeonId ?? '',
        ev.coupleId ?? '',
        ev.otherCageLabel ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [events, search, kindFilter, dateFrom, dateTo]);

  const hasActiveFilters =
    search.trim() !== '' || kindFilter !== 'ALL' || Boolean(dateFrom) || Boolean(dateTo);

  const resetFilters = useCallback(() => {
    setSearch('');
    setKindFilter('ALL');
    setDateFrom('');
    setDateTo('');
  }, []);

  const handleDeleteOne = useCallback(
    (eventId: string) => {
      if (!cageId) return;
      Alert.alert(
        'Supprimer cet événement ?',
        'Cette action est définitive.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              setDeletingId(eventId);
              try {
                await deleteCageOccupancyEvent(cageId, eventId);
                setEvents((prev) => prev.filter((e) => e.id !== eventId));
                appFeedback.success('Événement supprimé');
              } catch (e) {
                appFeedback.error(e instanceof Error ? e.message : 'Suppression impossible');
              } finally {
                setDeletingId(null);
              }
            },
          },
        ],
        { cancelable: true },
      );
    },
    [cageId],
  );

  const handleDeleteAll = useCallback(() => {
    if (!cageId) return;
    Alert.alert(
      'Tout supprimer ?',
      'Tout l’historique des mouvements de cette cage sera effacé définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            setPurging(true);
            try {
              const n = await deleteAllCageOccupancyEvents(cageId);
              setEvents([]);
              appFeedback.success(n > 0 ? `${n} événement(s) supprimé(s)` : 'Historique déjà vide');
            } catch (e) {
              appFeedback.error(e instanceof Error ? e.message : 'Suppression impossible');
            } finally {
              setPurging(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [cageId]);

  const kindLabel =
    kindFilter === 'ALL' ? 'Tous les types' : OCC_KIND_LABELS[kindFilter] ?? kindFilter;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backRow}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color={theme.slate800} />
          <Text style={styles.backTxt}>Retour</Text>
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.h1}>Historique complet</Text>
          <Text style={styles.sub} numberOfLines={1}>
            Cage {cageLabel || cageId || '…'}
          </Text>
        </View>
        <Pressable
          onPress={handleDeleteAll}
          disabled={purging || loading || !!loadError}
          style={[styles.purgeBtn, (purging || loading || loadError) && styles.opacityDim]}
        >
          <Text style={styles.purgeTxt}>{purging ? '…' : 'Tout supprimer'}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.teal600} />
          <Text style={styles.loadingTxt}>Chargement…</Text>
        </View>
      ) : null}

      {!loading && loadError ? (
        <View style={styles.centerFill}>
          <Text style={styles.err}>{loadError}</Text>
        </View>
      ) : null}

      {!loading && !loadError ? (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          style={styles.listFlex}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 28 }}
          ListHeaderComponent={
            <View style={styles.filters}>
              <Text style={styles.filterK}>Recherche</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Résumé, raison, ID…"
                placeholderTextColor={theme.slate500}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.filterK, { marginTop: 12 }]}>Type d’événement</Text>
              <Pressable style={styles.kindPick} onPress={() => setKindModalOpen(true)}>
                <Text style={styles.kindPickTxt}>{kindLabel}</Text>
                <Text style={styles.kindPickHint}>Modifier</Text>
              </Pressable>
              <View style={styles.dateRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.filterK}>Du (AAAA-MM-JJ)</Text>
                  <TextInput
                    value={dateFrom}
                    onChangeText={setDateFrom}
                    placeholder="2025-01-01"
                    placeholderTextColor={theme.slate500}
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.dateCol}>
                  <Text style={styles.filterK}>Au</Text>
                  <TextInput
                    value={dateTo}
                    onChangeText={setDateTo}
                    placeholder="2025-12-31"
                    placeholderTextColor={theme.slate500}
                    style={styles.input}
                    autoCapitalize="none"
                  />
                </View>
              </View>
              {hasActiveFilters ? (
                <Pressable style={styles.resetBtn} onPress={resetFilters}>
                  <FilterX size={18} color={theme.slate700} />
                  <Text style={styles.resetTxt}>Réinitialiser les filtres</Text>
                </Pressable>
              ) : null}
              <Text style={styles.hint}>
                Jusqu’à 500 entrées les plus récentes. Les filtres s’appliquent sur cette liste.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <ScrollText size={40} color={theme.slate500} />
              <Text style={styles.emptyTxt}>
                {events.length === 0
                  ? 'Aucun événement enregistré pour cette cage.'
                  : 'Aucun résultat avec les filtres actifs.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footerInline}>
              <Text style={styles.footerTxt}>
                {filtered.length} affiché(s) sur {events.length}
                {hasActiveFilters ? ' (filtres actifs)' : ''}
              </Text>
            </View>
          }
          renderItem={({ item: ev }) => {
            const reason = reasonLines(ev.reasonCode, ev.reasonDetail);
            return (
              <View style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.time}>{formatEventTime(ev.createdAt)}</Text>
                  <Text style={styles.kindTag}>{OCC_KIND_LABELS[ev.kind] ?? ev.kind}</Text>
                  <Text style={styles.summary}>{ev.summary}</Text>
                  {reason ? <Text style={styles.reason}>{reason}</Text> : null}
                </View>
                <Pressable
                  onPress={() => handleDeleteOne(ev.id)}
                  disabled={deletingId === ev.id || purging}
                  style={[styles.trashBtn, (deletingId === ev.id || purging) && styles.opacityDim]}
                  accessibilityLabel="Supprimer cet événement"
                >
                  {deletingId === ev.id ? (
                    <ActivityIndicator size="small" color={theme.red600} />
                  ) : (
                    <Trash2 size={20} color={theme.red600} />
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      ) : null}

      <Modal visible={kindModalOpen} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setKindModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Type d’événement</Text>
            <FlatList
              data={KIND_OPTIONS}
              keyExtractor={(o) => o.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.kindRow, kindFilter === item.id && styles.kindRowOn]}
                  onPress={() => {
                    setKindFilter(item.id);
                    setKindModalOpen(false);
                  }}
                >
                  <Text style={[styles.kindRowTxt, kindFilter === item.id && styles.kindRowTxtOn]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.modalClose} onPress={() => setKindModalOpen(false)}>
              <Text style={styles.modalCloseTxt}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.slate50 },
  listFlex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.slate200,
    backgroundColor: theme.white,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  backTxt: { fontSize: 15, fontWeight: '700', color: theme.slate800 },
  headerTitleBlock: { flex: 1, minWidth: 0 },
  h1: { fontSize: 17, fontWeight: '800', color: theme.slate900 },
  sub: { fontSize: 13, color: theme.slate500, marginTop: 2 },
  purgeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radiusMd,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  purgeTxt: { fontSize: 12, fontWeight: '800', color: '#991b1b' },
  opacityDim: { opacity: 0.45 },
  filters: { paddingBottom: 16, marginBottom: 4, backgroundColor: theme.slate50 },
  filterK: { fontSize: 12, fontWeight: '700', color: theme.slate600, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.slate200,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.slate900,
    backgroundColor: theme.white,
  },
  kindPick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.slate200,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: theme.white,
  },
  kindPickTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.slate800 },
  kindPickHint: { fontSize: 13, color: theme.teal700, fontWeight: '700' },
  dateRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dateCol: { flex: 1 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  resetTxt: { fontSize: 14, fontWeight: '700', color: theme.slate700 },
  hint: { marginTop: 10, fontSize: 12, color: theme.slate500, lineHeight: 18 },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingTxt: { marginTop: 12, fontSize: 15, color: theme.slate600 },
  err: { color: theme.red600, textAlign: 'center', fontSize: 15 },
  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTxt: { marginTop: 12, textAlign: 'center', fontSize: 15, color: theme.slate600, lineHeight: 22 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    padding: 14,
    borderRadius: theme.radiusLg,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.slate100,
    ...shadowCard,
  },
  cardBody: { flex: 1, minWidth: 0 },
  time: { fontSize: 11, fontWeight: '700', color: theme.slate500, textTransform: 'uppercase' },
  kindTag: { marginTop: 4, fontSize: 12, fontWeight: '700', color: theme.teal800 },
  summary: { marginTop: 6, fontSize: 15, fontWeight: '600', color: theme.slate900, lineHeight: 22 },
  reason: { marginTop: 6, fontSize: 13, color: theme.slate600, lineHeight: 19 },
  trashBtn: {
    padding: 10,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
  },
  footerInline: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.slate200,
  },
  footerTxt: { fontSize: 12, color: theme.slate600, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.slate900, marginBottom: 12 },
  kindRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.radiusMd,
    marginBottom: 6,
    backgroundColor: theme.slate50,
  },
  kindRowOn: { backgroundColor: '#ccfbf1', borderWidth: 1, borderColor: theme.teal100 },
  kindRowTxt: { fontSize: 15, color: theme.slate800 },
  kindRowTxtOn: { fontWeight: '800', color: theme.teal900 },
  modalClose: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  modalCloseTxt: { fontSize: 16, fontWeight: '700', color: theme.teal700 },
});
