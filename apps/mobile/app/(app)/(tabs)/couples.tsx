import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';

import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import { useCages } from '@shared/hooks/useCages';
import { rompreCouple } from '@shared/services/couplesService';
import type { Cage, Couple, Pigeon } from '@shared/types';

import { appFeedback } from '../../../lib/appFeedback';
import { EmptyStateCard } from '../../../components/layout/EmptyStateCard';
import { PageHeader } from '../../../components/layout/PageHeader';
import { TabHeaderTitle } from '../../../components/layout/TabHeaderTitle';
import {
  FloatingAddButton,
  FLOATING_ADD_LIST_PADDING_BOTTOM,
} from '../../../components/ui/FloatingAddButton';
import { AppLoadingView } from '../../../components/ui/AppLoadingView';
import type { ThemeColors } from '../../../constants/palettes';
import { useAppTheme } from '../../../context/AppThemeContext';
import { formatFirestoreDate } from '../../../utils/formatDate';

function compareCouplesRow(a: Couple, b: Couple, sortDir: 'asc' | 'desc'): number {
  const dir = sortDir === 'desc' ? -1 : 1;
  const ta = a.dateDebut?.toDate?.()?.getTime?.() ?? 0;
  const tb = b.dateDebut?.toDate?.()?.getTime?.() ?? 0;
  const cmp = ta - tb;
  if (cmp !== 0) return cmp * dir;
  return tb - ta;
}

export default function CouplesTabScreen() {
  const { colors: theme, shadowCard } = useAppTheme();
  const styles = useMemo(() => createCouplesStyles(theme), [theme]);
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <TabHeaderTitle Icon={Heart} label="Couples" />,
    });
  }, [navigation]);
  const { couples, loading, error, stats } = useCouples(false);
  const { pigeons, loading: lp } = usePigeons(false);
  const { cages, loading: lc } = useCages();
  const [query, setQuery] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<'ALL' | 'ACTIF' | 'ROMPU'>('ACTIF');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const pigeonById = useMemo(() => {
    const m = new Map<string, Pigeon>();
    pigeons.forEach((p) => m.set(p.id, p));
    return m;
  }, [pigeons]);

  const cageById = useMemo(() => {
    const m = new Map<string, Cage>();
    cages.forEach((c) => m.set(c.id, c));
    return m;
  }, [cages]);

  const qNorm = query.trim().toLowerCase();

  const rows = useMemo(() => {
    let list = couples.filter((c) => filtreStatut === 'ALL' || c.statut === filtreStatut);
    if (qNorm) {
      list = list.filter((c) => {
        const m = pigeonById.get(c.maleId);
        const f = pigeonById.get(c.femelleId);
        const hay = [c.notes, m?.matricule, m?.nom, f?.matricule, f?.nom].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(qNorm);
      });
    }
    return [...list].sort((a, b) => compareCouplesRow(a, b, sortDir));
  }, [couples, filtreStatut, qNorm, sortDir, pigeonById]);

  const onRompre = useCallback((c: Couple) => {
    appFeedback.alert('Rompre le couple', 'Cette action libère les cages concernées (selon règles métier). Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rompre',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await rompreCouple(c.id);
            } catch (e) {
              appFeedback.alert('Erreur', e instanceof Error ? e.message : 'Échec');
            }
          })();
        },
      },
    ]);
  }, []);

  const loadingAny = loading || lp || lc;

  const header = (
    <View style={styles.header}>
      <PageHeader description="Association mâle + femelle pour la reproduction. Un pigeon ne peut figurer que dans un seul couple actif à la fois. Touche la carte pour la fiche détail ; « Rompre » reste à droite pour les couples actifs. Nouveau couple : bouton + en bas à droite." />
      <TextInput
        style={styles.search}
        placeholder="Rechercher couple…"
        placeholderTextColor={theme.slate500}
        value={query}
        onChangeText={setQuery}
      />
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['ALL', 'ACTIF', 'ROMPU'] as const).map((st) => (
            <Pressable
              key={st}
              onPress={() => setFiltreStatut(st)}
              style={[styles.chip, filtreStatut === st && styles.chipOn]}
            >
              <Text style={[styles.chipTxt, filtreStatut === st && styles.chipTxtOn]}>
                {st === 'ALL' ? 'Tous' : st === 'ACTIF' ? 'Actifs' : 'Rompus'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} style={styles.dirBtn}>
          <Text style={styles.dirTxt}>Date {sortDir === 'desc' ? '↓' : '↑'}</Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>
        Actifs {stats.actifs} · Rompus {stats.rompus} · Total {stats.total}
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {loadingAny ? (
        <View style={styles.center}>
          <AppLoadingView
            variant="embedded"
            loadingContext="couples"
            message="Chargement des couples…"
            subtitle="Pigeons et cages associés."
          />
        </View>
      ) : error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <>
          <FlatList
            data={rows}
            keyExtractor={(c) => c.id}
            contentContainerStyle={[styles.list, { paddingBottom: FLOATING_ADD_LIST_PADDING_BOTTOM }]}
            ListHeaderComponent={
              <>
                {header}
                {!rows.length ? (
                  <EmptyStateCard
                    icon={<Heart size={28} color={theme.red600} strokeWidth={2} />}
                    iconBackgroundColor={theme.rose50}
                    title="Aucun couple enregistré"
                    hint="Crée un couple à partir de deux pigeons actifs. Tu pourras ensuite enregistrer des reproductions. Touche le bouton rond + en bas à droite."
                  />
                ) : null}
              </>
            }
          renderItem={({ item }) => {
            const m = pigeonById.get(item.maleId);
            const f = pigeonById.get(item.femelleId);
            const cage = item.cageId ? cageById.get(item.cageId) : null;
            return (
              <View style={[styles.card, shadowCard]}>
                <Pressable
                  style={styles.cardMain}
                  onPress={() =>
                    router.push({ pathname: '/couple/[coupleId]', params: { coupleId: item.id } })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Fiche couple ${m?.matricule ?? '?'} et ${f?.matricule ?? '?'}`}
                >
                  <Text style={styles.title}>
                    {m?.matricule ?? '?'} + {f?.matricule ?? '?'}
                  </Text>
                  <Text style={styles.sub}>
                    Depuis {formatFirestoreDate(item.dateDebut)} · {cage ? `Cage ${cage.numero}` : 'Sans cage'}
                  </Text>
                  <Text style={[styles.badge, item.statut === 'ROMPU' && styles.badgeOff]}>
                    {item.statut === 'ACTIF' ? 'Actif' : 'Rompu'}
                  </Text>
                </Pressable>
                {item.statut === 'ACTIF' ? (
                  <Pressable style={styles.rompre} onPress={() => onRompre(item)}>
                    <Text style={styles.rompreTxt}>Rompre</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
          />
          <FloatingAddButton
            onPress={() => router.push('/(app)/couple/nouveau')}
            accessibilityLabel="Nouveau couple"
            icon={<Heart size={24} color="#ffffff" strokeWidth={2.4} />}
          />
        </>
      )}
    </View>
  );
}

function createCouplesStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    header: { paddingHorizontal: theme.screenPadding, paddingBottom: 8, gap: 12 },
    search: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.radiusMd,
      padding: 12,
      fontSize: 16,
      color: theme.slate900,
      backgroundColor: theme.surfaceElevated,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chipOn: { backgroundColor: theme.teal50, borderColor: theme.teal600 },
    chipTxt: { fontSize: 12, fontWeight: '600', color: theme.slate700 },
    chipTxtOn: { color: theme.teal900 },
    dirBtn: { padding: 8 },
    dirTxt: { fontWeight: '700', color: theme.teal700 },
    meta: { fontSize: 13, color: theme.slate600, fontWeight: '600' },
    list: { paddingHorizontal: theme.screenPadding, paddingBottom: 28 },
    card: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceElevated,
      borderRadius: theme.radiusLg,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'flex-start',
    },
    cardMain: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: '800', color: theme.slate900 },
    sub: { fontSize: 13, color: theme.slate500, marginTop: 4 },
    badge: {
      alignSelf: 'flex-start',
      marginTop: 8,
      fontSize: 11,
      fontWeight: '800',
      color: theme.emerald900,
      backgroundColor: theme.emerald50,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      overflow: 'hidden',
    },
    badgeOff: { color: theme.slate700, backgroundColor: theme.slate100 },
    rompre: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.rose50,
      borderWidth: 1,
      borderColor: theme.rose900,
    },
    rompreTxt: { color: theme.rose900, fontWeight: '700', fontSize: 13 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    err: { color: theme.red600, padding: 16 },
  });
}
