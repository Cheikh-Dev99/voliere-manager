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
import { LayoutGrid, Plus } from 'lucide-react-native';

import { useCages } from '@shared/hooks/useCages';
import type { Cage, CageStatut } from '@shared/types';

import { PageHeader } from '../../../components/layout/PageHeader';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { SearchField } from '../../../components/ui/SearchField';
import { theme, shadowCard } from '../../../constants/theme';
import { useMergedVoliereCodes } from '../../../hooks/useMergedVoliereCodes';

const statutLabel: Record<CageStatut, string> = {
  LIBRE: 'Libre',
  OCCUPE_PIGEON: '1 pigeon',
  OCCUPE_COUPLE: 'Couple',
};

function compareRows(a: Cage, b: Cage, sortBy: string, sortDir: string): number {
  const dir = sortDir === 'desc' ? -1 : 1;
  let cmp = 0;
  switch (sortBy) {
    case 'nom':
      cmp = (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' });
      break;
    case 'numero':
      cmp = a.numero.localeCompare(b.numero, undefined, { numeric: true });
      break;
    case 'statut':
      cmp = a.statut.localeCompare(b.statut);
      break;
    case 'superficie':
      cmp = (Number(a.superficie) || 0) - (Number(b.superficie) || 0);
      break;
    default: {
      cmp = (a.voliereCode ?? 'A').localeCompare(b.voliereCode ?? 'A', 'fr', { sensitivity: 'base' });
      if (cmp === 0) cmp = a.numero.localeCompare(b.numero, undefined, { numeric: true });
    }
  }
  if (cmp !== 0) return cmp * dir;
  return a.numero.localeCompare(b.numero, undefined, { numeric: true });
}

export default function CagesTabScreen() {
  const router = useRouter();
  const { cages, loading, error } = useCages();
  const [query, setQuery] = useState('');
  const [filterStatut, setFilterStatut] = useState<'ALL' | CageStatut>('ALL');
  const [sortBy, setSortBy] = useState('voliere');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const codesVoliere = useMergedVoliereCodes();

  const qNorm = query.trim().toLowerCase();

  const sorted = useMemo(() => {
    const filtered = cages.filter((c) => {
      if (filterStatut !== 'ALL' && c.statut !== filterStatut) return false;
      if (!qNorm) return true;
      const hay = [c.numero, c.nom, c.description ?? '', c.voliereCode ?? 'A', statutLabel[c.statut]]
        .join(' ')
        .toLowerCase();
      return hay.includes(qNorm);
    });
    return [...filtered].sort((a, b) => compareRows(a, b, sortBy, sortDir));
  }, [cages, filterStatut, qNorm, sortBy, sortDir]);

  const header = (
    <View style={styles.header}>
      <PageHeader
        title="Cages"
        titleAccessory={<LayoutGrid size={26} color={theme.teal700} strokeWidth={2.2} />}
        description="Liste des cages par volière. Touche une ligne pour ouvrir la fiche (pigeons, occupation, historique)."
      />
      <PrimaryButton
        label="+ Nouvelle cage"
        icon={<Plus size={20} color={theme.white} strokeWidth={2.5} />}
        onPress={() =>
          router.push({
            pathname: '/(app)/cage/nouveau',
            params: { voliere: codesVoliere[0] ?? 'A' },
          })
        }
      />
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher par n° cage, nom, description…"
      />
      <Text style={styles.lab}>Occupation</Text>
      <View style={styles.row}>
        {(['ALL', 'LIBRE', 'OCCUPE_PIGEON', 'OCCUPE_COUPLE'] as const).map((st) => (
          <Pressable
            key={st}
            onPress={() => setFilterStatut(st)}
            style={[styles.chip, filterStatut === st && styles.chipOn]}
          >
            <Text style={[styles.chipTxt, filterStatut === st && styles.chipTxtOn]}>
              {st === 'ALL' ? 'Toutes' : statutLabel[st]}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.sortRow}>
        <Text style={styles.sortLab}>Tri</Text>
        {['voliere', 'numero', 'nom', 'statut'].map((k) => (
          <Pressable key={k} onPress={() => setSortBy(k)} style={[styles.sChip, sortBy === k && styles.sChipOn]}>
            <Text style={[styles.sChipTxt, sortBy === k && styles.sChipTxtOn]}>{k}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} style={styles.dirBtn}>
          <Text style={styles.dirTxt}>{sortDir === 'asc' ? '↑' : '↓'}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        {sorted.length} cage{sorted.length > 1 ? 's' : ''} · Volières : {codesVoliere.join(', ')}
      </Text>
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
          data={sorted}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={styles.muted}>Aucune cage pour ces filtres.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.line, shadowCard]}
              onPress={() => router.push(`/(app)/cage/${item.id}`)}
              accessibilityRole="button"
            >
              <View style={styles.lineMain}>
                <Text style={styles.lineTitle}>
                  {item.voliereCode ?? 'A'} · {item.numero}
                </Text>
                <Text style={styles.lineSub}>{item.nom}</Text>
              </View>
              <Text style={styles.badge}>{statutLabel[item.statut]}</Text>
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
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sortLab: { fontSize: 13, color: theme.slate600, fontWeight: '700' },
  sChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sChipOn: { borderColor: theme.teal600, backgroundColor: theme.teal50 },
  sChipTxt: { fontSize: 11, color: theme.slate600, textTransform: 'capitalize' },
  sChipTxtOn: { color: theme.teal900, fontWeight: '700' },
  dirBtn: { paddingHorizontal: 10, paddingVertical: 4, marginLeft: 4 },
  dirTxt: { fontSize: 16, fontWeight: '800', color: theme.teal700 },
  hint: { fontSize: 13, color: theme.slate600, fontWeight: '600' },
  list: { paddingHorizontal: theme.screenPadding, paddingBottom: 28 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  lineMain: { flex: 1, marginRight: 8 },
  lineTitle: { fontSize: 16, fontWeight: '700', color: theme.slate900 },
  lineSub: { fontSize: 13, color: theme.slate500, marginTop: 2 },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.teal800,
    backgroundColor: theme.teal100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muted: { textAlign: 'center', color: theme.slate500, marginTop: 24, marginBottom: 24 },
  err: { color: theme.red600, margin: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
