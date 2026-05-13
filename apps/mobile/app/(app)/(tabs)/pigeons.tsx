import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bird, Plus } from 'lucide-react-native';

import { usePigeons } from '@shared/hooks/usePigeons';
import type { Pigeon, PigeonStatut } from '@shared/types';

import { EmptyStateCard } from '../../../components/layout/EmptyStateCard';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { SearchField } from '../../../components/ui/SearchField';
import { theme, shadowCard } from '../../../constants/theme';

const STATUT_LABEL: Record<PigeonStatut, string> = {
  ACTIF: 'Actif',
  VENDU: 'Vendu',
  MORT: 'Mort',
  PERDU: 'Perdu',
};

export default function PigeonsTabScreen() {
  const router = useRouter();
  const { pigeons, loading, error, stats } = usePigeons(false);
  const [query, setQuery] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<'ALL' | PigeonStatut>('ALL');

  const qNorm = query.trim().toLowerCase();

  const rows = useMemo(() => {
    return pigeons.filter((p) => {
      if (filtreStatut !== 'ALL' && p.statut !== filtreStatut) return false;
      if (!qNorm) return true;
      const hay = [p.matricule, p.nom, p.race, p.notes].join(' ').toLowerCase();
      return hay.includes(qNorm);
    });
  }, [pigeons, filtreStatut, qNorm]);

  const header = (
    <View style={styles.header}>
      <PageHeader
        title="Pigeons"
        titleAccessory={<Bird size={26} color={theme.teal700} strokeWidth={2.2} />}
        description="Chaque pigeon a un matricule unique (bague). Tu peux consulter la fiche, la description et l’historique depuis une ligne."
      >
        <PrimaryButton
          label="+ Nouveau pigeon"
          icon={<Plus size={20} color={theme.white} strokeWidth={2.5} />}
          onPress={() => router.push('/(app)/pigeon/nouveau')}
        />
      </PageHeader>

      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Matricule, nom ou race…"
      />

      <Text style={styles.lab}>Statut</Text>
      <View style={styles.row}>
        {(['ALL', 'ACTIF', 'VENDU', 'MORT', 'PERDU'] as const).map((st) => (
          <Pressable
            key={st}
            onPress={() => setFiltreStatut(st)}
            style={[styles.chip, filtreStatut === st && styles.chipOn]}
          >
            <Text style={[styles.chipTxt, filtreStatut === st && styles.chipTxtOn]}>
              {st === 'ALL' ? 'Tous' : STATUT_LABEL[st]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.meta}>
        Actifs {stats.actifs} · Total {stats.total}
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.teal700} />
          <Text style={styles.muted}>Chargement…</Text>
        </View>
      ) : error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {header}
              {!rows.length ? (
                <EmptyStateCard
                  icon={<Bird size={28} color={theme.teal700} strokeWidth={2} />}
                  title="Aucun pigeon pour l'instant"
                  hint="Enregistre ton premier pigeon avec son matricule, sexe, race et date de naissance."
                  bullets={[
                    'Utilise le bouton « + Nouveau pigeon » ci-dessus.',
                    'Ensuite : couples, reproductions, etc. depuis le web ou l’app.',
                  ]}
                  primaryLabel="+ Créer un pigeon"
                  onPrimaryPress={() => router.push('/(app)/pigeon/nouveau')}
                />
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, shadowCard]}
              onPress={() => router.push(`/(app)/pigeon/${item.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.mat}>{item.matricule}</Text>
                <Text style={styles.nom} numberOfLines={1}>
                  {item.nom}
                </Text>
                <Text style={styles.meta2} numberOfLines={1}>
                  {item.race} · {item.sexe}
                </Text>
              </View>
              <View style={[styles.pill, item.statut !== 'ACTIF' && styles.pillOff]}>
                <Text style={styles.pillTxt}>{STATUT_LABEL[item.statut]}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.slate50 },
  header: { paddingHorizontal: theme.screenPadding, paddingBottom: 8, gap: 12 },
  lab: { fontSize: 13, fontWeight: '700', color: theme.slate800, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipOn: { backgroundColor: theme.teal50, borderColor: theme.teal600 },
  chipTxt: { fontSize: 12, fontWeight: '600', color: theme.slate700 },
  chipTxtOn: { color: theme.teal900 },
  meta: { fontSize: 13, color: theme.slate600, fontWeight: '600' },
  list: { paddingHorizontal: theme.screenPadding, paddingBottom: 28 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  mat: { fontSize: 17, fontWeight: '800', color: theme.slate900 },
  nom: { fontSize: 15, color: theme.slate700, marginTop: 2 },
  meta2: { fontSize: 13, color: theme.slate500, marginTop: 2 },
  pill: {
    backgroundColor: theme.emerald50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  pillOff: { backgroundColor: theme.slate100, borderColor: theme.slate200 },
  pillTxt: { fontSize: 11, fontWeight: '800', color: theme.emerald900 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { marginTop: 8, color: theme.slate500 },
  err: { color: theme.red600, padding: 16 },
});
