import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Home, LayoutGrid, Plus } from 'lucide-react-native';

import type { Cage, Couple, Pigeon } from '@shared/types';
import { useCages } from '@shared/hooks/useCages';
import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import {
  cageMatchesQuery,
  compareCages,
} from '@shared/utils/voliereCageList';

import { EmptyStateCard } from '../../../components/layout/EmptyStateCard';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { SearchField } from '../../../components/ui/SearchField';
import { useMergedVoliereCodes } from '../../../hooks/useMergedVoliereCodes';
import { theme, shadowCard } from '../../../constants/theme';

const FILTRES: { id: string; label: string }[] = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'LIBRE', label: 'Libres' },
  { id: 'OCCUPE_PIGEON', label: '1 pigeon' },
  { id: 'OCCUPE_COUPLE', label: 'Couples' },
];

const STATUT_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  LIBRE: { bg: theme.emerald50, border: '#a7f3d0', text: theme.emerald900, dot: '#22c55e' },
  OCCUPE_PIGEON: { bg: theme.rose50, border: '#fecdd3', text: theme.rose900, dot: '#f43f5e' },
  OCCUPE_COUPLE: { bg: theme.amber50, border: '#fde68a', text: theme.amber950, dot: '#f59e0b' },
};

function CageCard({
  cage,
  subtitle,
  onPress,
}: {
  cage: Cage;
  subtitle: string;
  onPress: () => void;
}) {
  const st = STATUT_STYLE[cage.statut] ?? STATUT_STYLE.LIBRE;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: st.bg, borderColor: st.border },
        shadowCard,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Cage ${cage.numero}`}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardNum}>{cage.numero}</Text>
        <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
      </View>
      <Text style={[styles.cardSub, { color: st.text }]} numberOfLines={3}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

export default function VoliereTabScreen() {
  const router = useRouter();
  const { cages, loading: lc, error: ec } = useCages();
  const { pigeons, loading: lp } = usePigeons(true);
  const { couples, loading: lco } = useCouples(false);

  const [voliereCode, setVoliereCode] = useState('A');
  const [filtre, setFiltre] = useState('ALL');
  const [query, setQuery] = useState('');

  const pigeonById = useMemo(() => {
    const m = new Map<string, Pigeon>();
    pigeons.forEach((p) => m.set(p.id, p));
    return m;
  }, [pigeons]);

  const coupleById = useMemo(() => {
    const m = new Map<string, Couple>();
    couples.forEach((c) => m.set(c.id, c));
    return m;
  }, [couples]);

  const maleByCouple = useMemo(() => {
    const m = new Map<string, Pigeon>();
    couples.forEach((c) => {
      const male = pigeonById.get(c.maleId);
      if (male) m.set(c.id, male);
    });
    return m;
  }, [couples, pigeonById]);

  const femelleByCouple = useMemo(() => {
    const m = new Map<string, Pigeon>();
    couples.forEach((c) => {
      const f = pigeonById.get(c.femelleId);
      if (f) m.set(c.id, f);
    });
    return m;
  }, [couples, pigeonById]);

  const codesVoliere = useMergedVoliereCodes();

  useEffect(() => {
    if (codesVoliere.length === 0) return;
    if (!codesVoliere.includes(voliereCode)) {
      setVoliereCode(codesVoliere[0] ?? 'A');
    }
  }, [codesVoliere, voliereCode]);

  const qNorm = query.trim().toLowerCase();

  const rows = useMemo(() => {
    let list = cages.filter((c) => (c.voliereCode ?? 'A') === voliereCode);
    if (filtre !== 'ALL') list = list.filter((c) => c.statut === filtre);
    list = list.filter((c) =>
      cageMatchesQuery(c, qNorm, pigeonById, coupleById, maleByCouple, femelleByCouple),
    );
    return [...list].sort((a, b) =>
      compareCages(a, b, 'numero', 'asc', pigeonById, coupleById, maleByCouple, femelleByCouple),
    );
  }, [cages, voliereCode, filtre, qNorm, pigeonById, coupleById, maleByCouple, femelleByCouple]);

  function subtitleFor(cage: Cage): string {
    if (cage.statut === 'LIBRE') return 'Libre';
    if (cage.statut === 'OCCUPE_PIGEON' && cage.pigeonId) {
      const p = pigeonById.get(cage.pigeonId);
      return p ? `1 pigeon\n${p.matricule} · ${p.nom}` : '1 pigeon';
    }
    if (cage.statut === 'OCCUPE_COUPLE' && cage.coupleId) {
      const cp = coupleById.get(cage.coupleId);
      if (!cp) return 'Couple (2 pigeons)';
      const m = maleByCouple.get(cp.id);
      const f = femelleByCouple.get(cp.id);
      if (m && f) return `2 pigeons\n${m.matricule} · ${f.matricule}\n${m.nom} / ${f.nom}`;
      return 'Couple (2 pigeons)';
    }
    return cage.statut;
  }

  const cellW = useMemo(() => {
    const w = Dimensions.get('window').width;
    const pad = theme.screenPadding * 2;
    return (w - pad - 10) / 2;
  }, []);

  const loading = lc || lp || lco;
  const err = ec;
  const count = rows.length;

  const listHeader = (
    <View style={styles.headerBlock}>
      <PageHeader
        title={`Volière ${voliereCode}`}
        titleAccessory={<Home size={26} color={theme.teal700} strokeWidth={2.2} />}
        description="Légende : vert libre, rose occupée (1 pigeon), ambre couple. Création de couples : onglet Couples, menu Navigation, ou fiches cage."
      >
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendTxt}>Libre</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f43f5e' }]} />
            <Text style={styles.legendTxt}>Occupée</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendTxt}>Couple</Text>
          </View>
        </View>
        <Text style={styles.summary}>
          {count === 0
            ? `Aucune cage dans la volière ${voliereCode}`
            : `${count} cage${count > 1 ? 's' : ''} dans la volière ${voliereCode}`}
        </Text>
        <PrimaryButton
          label="+ Nouvelle cage pour cette volière"
          icon={<Plus size={20} color={theme.white} strokeWidth={2.5} />}
          onPress={() =>
            router.push({ pathname: '/(app)/cage/nouveau', params: { voliere: voliereCode } })
          }
        />
      </PageHeader>

      <Text style={styles.fieldLab}>Choisir la volière</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {codesVoliere.map((code) => (
          <Pressable
            key={code}
            onPress={() => setVoliereCode(code)}
            style={[styles.chip, voliereCode === code && styles.chipOn]}
          >
            <Text style={[styles.chipTxt, voliereCode === code && styles.chipTxtOn]}>
              Volière {code}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={[styles.fieldLab, { marginTop: 12 }]}>Recherche</Text>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher par n° cage, nom, description…"
      />

      <Text style={[styles.fieldLab, { marginTop: 12 }]}>Occupation</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {FILTRES.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFiltre(f.id)}
            style={[styles.chip, filtre === f.id && styles.chipOn]}
          >
            <Text style={[styles.chipTxt, filtre === f.id && styles.chipTxtOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.teal700} />
          <Text style={styles.muted}>Chargement de la volière…</Text>
        </View>
      ) : err ? (
        <Text style={styles.err}>{err}</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.colWrap}
          contentContainerStyle={styles.listPad}
          ListHeaderComponent={
            <>
              {listHeader}
              {!rows.length ? (
                <EmptyStateCard
                  icon={<LayoutGrid size={28} color={theme.teal700} strokeWidth={2} />}
                  title={`Aucune cage pour cette volière (${voliereCode}).`}
                  hint="Crée une ou plusieurs cages (y compris par lot) avec le bouton ci-dessus. Tu peux aussi changer de code volière."
                  primaryLabel="+ Nouvelle cage pour cette volière"
                  onPrimaryPress={() =>
                    router.push({ pathname: '/(app)/cage/nouveau', params: { voliere: voliereCode } })
                  }
                />
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <View style={{ width: cellW, marginBottom: 12 }}>
              <CageCard
                cage={item}
                subtitle={subtitleFor(item)}
                onPress={() => router.push(`/(app)/cage/${item.id}`)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.slate50 },
  headerBlock: { paddingHorizontal: theme.screenPadding, paddingBottom: 8 },
  fieldLab: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.slate800,
    marginBottom: 6,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontSize: 13, color: theme.slate600, fontWeight: '600' },
  summary: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: theme.slate800,
  },
  chipsScroll: { marginBottom: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: theme.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipOn: { backgroundColor: theme.teal50, borderColor: theme.teal600 },
  chipTxt: { color: theme.slate700, fontWeight: '600', fontSize: 13 },
  chipTxtOn: { color: theme.teal900 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 8, color: theme.slate500, textAlign: 'center' },
  err: { color: theme.red600, padding: 16, textAlign: 'center' },
  listPad: { paddingBottom: 32, paddingTop: 4 },
  colWrap: { justifyContent: 'space-between', paddingHorizontal: theme.screenPadding },
  card: {
    flex: 1,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    padding: 12,
    minHeight: 100,
  },
  cardPressed: { opacity: 0.94 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardNum: { fontSize: 17, fontWeight: '800', color: theme.slate900 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardSub: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
});
