import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useNavigation, useRouter } from 'expo-router';
import { ClipboardList, Plus } from 'lucide-react-native';

import { useSorties } from '@shared/hooks/useSorties';
import { usePigeons } from '@shared/hooks/usePigeons';
import type { SortieType } from '@shared/types';

import { PigeonPhotoAvatar } from '../../../components/pigeons/PigeonPhotoAvatar';
import { PageHeader } from '../../../components/layout/PageHeader';
import { TabHeaderTitle } from '../../../components/layout/TabHeaderTitle';
import {
  FloatingAddButton,
  FLOATING_ADD_LIST_PADDING_BOTTOM,
} from '../../../components/ui/FloatingAddButton';
import { SearchField } from '../../../components/ui/SearchField';
import { AppLoadingView } from '../../../components/ui/AppLoadingView';
import { theme, shadowCard } from '../../../constants/theme';
import { formatFirestoreDate } from '../../../utils/formatDate';

const TYPE_LABEL: Record<SortieType, string> = {
  VENTE: 'Vente',
  DECES: 'Décès',
  PERTE: 'Perte',
};

const CHIP: Record<'ALL' | SortieType, { on: object; off: object; txtOn: object; txtOff: object }> = {
  ALL: {
    on: { backgroundColor: theme.slate100, borderColor: theme.slate500 },
    off: { backgroundColor: theme.white, borderColor: theme.border },
    txtOn: { color: theme.slate900 },
    txtOff: { color: theme.slate600 },
  },
  VENTE: {
    on: { backgroundColor: theme.teal50, borderColor: theme.teal600 },
    off: { backgroundColor: theme.white, borderColor: theme.border },
    txtOn: { color: theme.teal900 },
    txtOff: { color: theme.slate600 },
  },
  DECES: {
    on: { backgroundColor: theme.slate100, borderColor: theme.slate500 },
    off: { backgroundColor: theme.white, borderColor: theme.border },
    txtOn: { color: theme.slate900 },
    txtOff: { color: theme.slate600 },
  },
  PERTE: {
    on: { backgroundColor: theme.amber50, borderColor: '#f59e0b' },
    off: { backgroundColor: theme.white, borderColor: theme.border },
    txtOn: { color: theme.amber950 },
    txtOff: { color: theme.slate600 },
  },
};

export default function SortiesTabScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { sorties, loading, error, stats } = useSorties();
  const { pigeons } = usePigeons(true);

  const pigeonById = useMemo(() => {
    const m = new Map<string, (typeof pigeons)[number]>();
    pigeons.forEach((p) => m.set(p.id, p));
    return m;
  }, [pigeons]);
  const [query, setQuery] = useState('');
  const [filtreType, setFiltreType] = useState<'ALL' | SortieType>('ALL');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <TabHeaderTitle Icon={ClipboardList} label="Sorties" />,
    });
  }, [navigation]);

  const qNorm = query.trim().toLowerCase();

  const rows = useMemo(() => {
    return sorties.filter((s) => {
      if (filtreType !== 'ALL' && s.type !== filtreType) return false;
      if (!qNorm) return true;
      const hay = [
        s.pigeonMatricule,
        s.notes,
        s.acheteur,
        s.cause,
        s.circonstance,
        TYPE_LABEL[s.type],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(qNorm);
    });
  }, [sorties, filtreType, qNorm]);

  const onNouvelleSortie = () => {
    router.push('/sortie/nouveau');
  };

  const header = (
    <View style={styles.header}>
      <PageHeader description="Enregistre une vente, un décès ou une perte. Chaque sortie met à jour le statut du pigeon et libère la cage ou le couple actif selon les règles métier. Touche le bouton + pour ouvrir le formulaire." />
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Matricule, acheteur, notes…"
      />
      <View style={styles.pillRow}>
        {(['ALL', 'VENTE', 'DECES', 'PERTE'] as const).map((t) => {
          const on = filtreType === t;
          const pal = CHIP[t];
          return (
            <Pressable
              key={t}
              onPress={() => setFiltreType((prev) => (prev === t && t !== 'ALL' ? 'ALL' : t))}
              style={[styles.pill, on ? pal.on : pal.off]}
            >
              <Text style={[styles.pillTxt, on ? pal.txtOn : pal.txtOff]}>
                {t === 'ALL'
                  ? `Total ${stats.total}`
                  : `${TYPE_LABEL[t]} (${t === 'VENTE' ? stats.ventes : t === 'DECES' ? stats.deces : stats.pertes})`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.pillHint}>
        Touche une pastille pour filtrer par type ; reclique sur la même pour tout afficher.
      </Text>
      <Text style={styles.sectionTitle}>Historique des sorties</Text>
      <Text style={styles.sectionSub}>
        Chaque ligne correspond à une sortie. Touche une ligne pour la fiche détail ; fiche pigeon complète dans
        l’onglet Pigeons.
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          <AppLoadingView
            variant="embedded"
            loadingContext="sorties"
            message="Chargement des sorties…"
            subtitle="Ventes, décès et pertes."
          />
        </View>
      ) : error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <>
          <FlatList
            data={rows}
            keyExtractor={(s) => s.id}
            style={styles.listFlex}
            contentContainerStyle={[styles.list, { paddingBottom: FLOATING_ADD_LIST_PADDING_BOTTOM }]}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                {header}
                {!rows.length ? (
                  <View style={[styles.emptyCard, shadowCard]}>
                    <Text style={styles.emptyTitle}>Aucune sortie enregistrée</Text>
                    <Text style={styles.emptyHint}>
                      Touche le bouton + en bas à droite pour enregistrer une vente, un décès ou une perte depuis
                      l’application.
                    </Text>
                  </View>
                ) : null}
              </>
            }
            renderItem={({ item }) => {
              const pigeon = pigeonById.get(item.pigeonId);
              const photoRef = pigeon ?? { id: item.pigeonId };
              return (
                <Link
                  href={{ pathname: '/sortie/[sortieId]', params: { sortieId: item.id } }}
                  asChild
                  accessibilityLabel={`Fiche sortie ${TYPE_LABEL[item.type]} ${item.pigeonMatricule ?? ''}`}
                >
                  <Pressable style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}>
                    <View style={[styles.card, shadowCard]}>
                      <View style={styles.cardMainRow}>
                        <PigeonPhotoAvatar pigeon={photoRef} size="sm" />
                        <View style={styles.cardBody}>
                          <View style={styles.rowTop}>
                            <Text style={styles.type}>{TYPE_LABEL[item.type]}</Text>
                            <Text style={styles.date}>{formatFirestoreDate(item.date)}</Text>
                          </View>
                          <Text style={styles.mat}>{item.pigeonMatricule ?? '—'}</Text>
                          {item.type === 'VENTE' && (item.prix != null || item.acheteur) ? (
                            <Text style={styles.sub}>
                              {item.prix != null ? `${item.prix} ` : ''}
                              {item.acheteur ? `· ${item.acheteur}` : ''}
                            </Text>
                          ) : null}
                          {item.type === 'DECES' && item.cause ? <Text style={styles.sub}>{item.cause}</Text> : null}
                          {item.type === 'PERTE' && item.circonstance ? (
                            <Text style={styles.sub}>{item.circonstance}</Text>
                          ) : null}
                          {item.notes ? (
                            <Text style={styles.notes} numberOfLines={3}>
                              {item.notes}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </Link>
              );
            }}
          />
          <FloatingAddButton
            onPress={onNouvelleSortie}
            accessibilityLabel="Nouvelle sortie"
            icon={<Plus size={26} color={theme.white} strokeWidth={2.5} />}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  listFlex: { flex: 1 },
  header: { paddingHorizontal: theme.screenPadding, paddingBottom: 8, gap: 12 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillTxt: { fontSize: 12, fontWeight: '700' },
  pillHint: { fontSize: 12, color: theme.slate500, lineHeight: 17 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: theme.slate900, marginTop: 4 },
  sectionSub: { fontSize: 13, color: theme.slate600, lineHeight: 18 },
  list: { paddingHorizontal: theme.screenPadding, paddingBottom: 28 },
  emptyCard: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    marginTop: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.slate900, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: theme.slate600, lineHeight: 20 },
  cardPressable: { marginBottom: 10 },
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardPressed: { opacity: 0.92 },
  cardMainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  type: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.teal800,
    backgroundColor: theme.teal100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  date: { fontSize: 12, color: theme.slate500, fontWeight: '600' },
  mat: { fontSize: 17, fontWeight: '800', color: theme.slate900 },
  sub: { fontSize: 13, color: theme.slate600, marginTop: 4 },
  notes: { fontSize: 13, color: theme.slate500, marginTop: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: theme.red600, padding: 16 },
});
