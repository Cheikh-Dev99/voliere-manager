import { useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Link, useNavigation, useRouter } from 'expo-router';
import { Egg } from 'lucide-react-native';

import { useReproductions } from '@shared/hooks/useReproductions';
import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import type { Couple, Pigeon } from '@shared/types';

import { EmptyStateCard } from '../../../components/layout/EmptyStateCard';
import { PageHeader } from '../../../components/layout/PageHeader';
import { TabScreenFade } from '../../../components/layout/TabScreenFade';
import { TabHeaderTitle } from '../../../components/layout/TabHeaderTitle';
import {
  FloatingAddButton,
  FLOATING_ADD_LIST_PADDING_BOTTOM,
} from '../../../components/ui/FloatingAddButton';
import { AnimatedPressable } from '../../../components/ui/AnimatedPressable';
import { SearchField } from '../../../components/ui/SearchField';
import { AppLoadingView } from '../../../components/ui/AppLoadingView';
import type { ThemeColors } from '../../../constants/palettes';
import { useAppTheme } from '../../../context/AppThemeContext';
import { formatFirestoreDate } from '../../../utils/formatDate';

export default function ReproductionsTabScreen() {
  const { colors: theme, shadowCard } = useAppTheme();
  const styles = useMemo(() => createReproductionsStyles(theme), [theme]);
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <TabHeaderTitle Icon={Egg} label="Reproductions" />,
    });
  }, [navigation]);
  const { reproductions, loading, error } = useReproductions();
  const { couples } = useCouples(false);
  const { pigeons } = usePigeons(false);
  const [query, setQuery] = useState('');

  const coupleById = useMemo(() => {
    const m = new Map<string, Couple>();
    couples.forEach((c) => m.set(c.id, c));
    return m;
  }, [couples]);

  const pigeonById = useMemo(() => {
    const m = new Map<string, Pigeon>();
    pigeons.forEach((p) => m.set(p.id, p));
    return m;
  }, [pigeons]);

  const qNorm = query.trim().toLowerCase();

  const rows = useMemo(() => {
    if (!qNorm) return reproductions;
    return reproductions.filter((r) => {
      const cp = coupleById.get(r.coupleId);
      if (!cp) return r.notes?.toLowerCase().includes(qNorm);
      const m = pigeonById.get(cp.maleId);
      const f = pigeonById.get(cp.femelleId);
      const hay = [r.notes, m?.matricule, m?.nom, f?.matricule, f?.nom].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(qNorm);
    });
  }, [reproductions, qNorm, coupleById, pigeonById]);

  const header = (
    <View style={styles.header}>
      <PageHeader description="Portées enregistrées pour tes couples. Touche une ligne pour la fiche détail. Nouvelle reproduction : bouton + en bas à droite ou menu Navigation." />
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher (couple, notes)…"
      />
    </View>
  );

  return (
    <TabScreenFade>
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          <AppLoadingView
            variant="embedded"
            loadingContext="reproduction"
            message="Chargement des reproductions…"
            subtitle="Portées et couples associés."
          />
        </View>
      ) : error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <>
          <FlatList
            data={rows}
            keyExtractor={(r) => r.id}
            contentContainerStyle={[styles.list, { paddingBottom: FLOATING_ADD_LIST_PADDING_BOTTOM }]}
            ListHeaderComponent={
              <>
                {header}
                {!rows.length ? (
                  <EmptyStateCard
                    icon={<Egg size={30} color={theme.slate500} strokeWidth={1.8} />}
                    iconBackgroundColor={theme.slate100}
                    title="Aucune reproduction enregistrée"
                    hint="Enregistre une première portée avec le bouton rond + en bas à droite ou via l’onglet Menu (Navigation)."
                  />
                ) : null}
              </>
            }
            renderItem={({ item }) => {
            const cp = coupleById.get(item.coupleId);
            const m = cp ? pigeonById.get(cp.maleId) : null;
            const f = cp ? pigeonById.get(cp.femelleId) : null;
            const label = m && f ? `${m.matricule} · ${f.matricule}` : `Couple ${item.coupleId.slice(0, 6)}…`;
            return (
              <Link
                href={{ pathname: '/reproduction/[reproductionId]', params: { reproductionId: item.id } }}
                asChild
                accessibilityLabel={`Fiche reproduction ${label}`}
              >
                <AnimatedPressable style={styles.cardPressable}>
                  <View style={[styles.card, shadowCard]}>
                    <Text style={styles.title}>{label}</Text>
                    <Text style={styles.sub}>
                      Ponte {formatFirestoreDate(item.datePonte)} · Œufs {item.nombreOeufs} · jeunes{' '}
                      {item.nombrePigeonneaux}
                    </Text>
                    {item.notes ? (
                      <Text style={styles.notes} numberOfLines={2}>
                        {item.notes}
                      </Text>
                    ) : null}
                  </View>
                </AnimatedPressable>
              </Link>
            );
          }}
          />
          <FloatingAddButton
            onPress={() => router.push('/(app)/reproduction/nouveau')}
            accessibilityLabel="Nouvelle reproduction"
            icon={<Egg size={24} color="#ffffff" strokeWidth={2.4} />}
          />
        </>
      )}
    </View>
    </TabScreenFade>
  );
}

function createReproductionsStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    header: { paddingHorizontal: theme.screenPadding, paddingBottom: 8, gap: 12 },
    list: { paddingHorizontal: theme.screenPadding, paddingBottom: 28 },
    cardPressable: { marginBottom: 10 },
    card: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: theme.radiusLg,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardPressed: { opacity: 0.92 },
    title: { fontSize: 16, fontWeight: '800', color: theme.slate900 },
    sub: { fontSize: 13, color: theme.slate600, marginTop: 4 },
    notes: { fontSize: 13, color: theme.slate500, marginTop: 6 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    err: { color: theme.red600, padding: 16 },
  });
}
