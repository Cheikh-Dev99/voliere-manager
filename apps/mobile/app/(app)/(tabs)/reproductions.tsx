import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Egg, Plus } from 'lucide-react-native';

import { useReproductions } from '@shared/hooks/useReproductions';
import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import type { Couple, Pigeon } from '@shared/types';

import { EmptyStateCard } from '../../../components/layout/EmptyStateCard';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { SearchField } from '../../../components/ui/SearchField';
import { theme, shadowCard } from '../../../constants/theme';
import { formatFirestoreDate } from '../../../utils/formatDate';

export default function ReproductionsTabScreen() {
  const router = useRouter();
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
      <PageHeader
        title="Reproductions"
        titleAccessory={<Egg size={26} color={theme.teal700} strokeWidth={2.2} />}
        description="Portées enregistrées pour tes couples. Tu peux créer une fiche depuis l’onglet Reproductions (bouton) ou depuis le menu Navigation."
      >
        <PrimaryButton
          label="+ Nouvelle reproduction"
          icon={<Plus size={20} color={theme.white} strokeWidth={2.5} />}
          onPress={() => router.push('/(app)/reproduction/nouveau')}
        />
      </PageHeader>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher (couple, notes)…"
      />
    </View>
  );

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.teal700} />
        </View>
      ) : error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {header}
              {!rows.length ? (
                <EmptyStateCard
                  icon={<Egg size={30} color={theme.slate500} strokeWidth={1.8} />}
                  iconBackgroundColor={theme.slate100}
                  title="Aucune reproduction enregistrée"
                  hint="Enregistre une première portée avec le bouton ci-dessus ou via l’onglet Menu (Navigation)."
                  primaryLabel="+ Enregistrer une première portée"
                  onPrimaryPress={() => router.push('/(app)/reproduction/nouveau')}
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
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.slate50 },
  header: { paddingHorizontal: theme.screenPadding, paddingBottom: 8, gap: 12 },
  list: { paddingHorizontal: theme.screenPadding, paddingBottom: 28 },
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: { fontSize: 16, fontWeight: '800', color: theme.slate900 },
  sub: { fontSize: 13, color: theme.slate600, marginTop: 4 },
  notes: { fontSize: 13, color: theme.slate500, marginTop: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: theme.red600, padding: 16 },
});
