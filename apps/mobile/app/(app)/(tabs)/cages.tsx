import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';

import { useCages } from '@shared/hooks/useCages';
import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import { supprimerCage } from '@shared/services/cagesService';
import type { Cage, CageStatut, Couple, Pigeon } from '@shared/types';

import { appFeedback } from '../../../lib/appFeedback';
import { readCagesListPrefs, writeCagesListPrefs } from '../../../lib/cagesListPrefs';
import { CageListRow } from '../../../components/cages/CageListRow';
import { PageHeader } from '../../../components/layout/PageHeader';
import { TabScreenFade } from '../../../components/layout/TabScreenFade';
import { TabHeaderTitle } from '../../../components/layout/TabHeaderTitle';
import {
  FloatingAddButton,
  FLOATING_ADD_LIST_PADDING_BOTTOM,
} from '../../../components/ui/FloatingAddButton';
import { MobileLabeledSelect } from '../../../components/ui/MobileLabeledSelect';
import { SearchField } from '../../../components/ui/SearchField';
import { AppLoadingView } from '../../../components/ui/AppLoadingView';
import type { ThemeColors } from '../../../constants/palettes';
import { useAppTheme } from '../../../context/AppThemeContext';
import { useMergedVoliereCodes } from '../../../hooks/useMergedVoliereCodes';

const statutLabel: Record<CageStatut, string> = {
  LIBRE: 'Libre',
  OCCUPE_PIGEON: '1 pigeon',
  OCCUPE_COUPLE: 'Couple',
};

const SORT_KEYS: { id: string; label: string }[] = [
  { id: 'voliere', label: 'Volière' },
  { id: 'numero', label: 'N°' },
  { id: 'nom', label: 'Nom' },
  { id: 'statut', label: 'Statut' },
];

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

function createCagesTabStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    header: { paddingHorizontal: theme.screenPadding, paddingBottom: 8, gap: 12 },
    filtersRow: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      width: '100%',
      gap: 10,
      alignItems: 'flex-start',
    },
    sortRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    sortLab: { fontSize: 13, color: theme.slate600, fontWeight: '700' },
    sChip: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: theme.radiusSm,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sChipOn: { borderColor: theme.teal600, backgroundColor: theme.teal50 },
    sChipTxt: { fontSize: 11, color: theme.slate600, textTransform: 'capitalize' },
    sChipTxtOn: { color: theme.teal900, fontWeight: '700' },
    dirBtn: { paddingHorizontal: 10, paddingVertical: 4, marginLeft: 4 },
    dirTxt: { fontSize: 16, fontWeight: '800', color: theme.teal700 },
    hint: { fontSize: 13, color: theme.slate600, fontWeight: '600' },
    toolbarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
    tbBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: theme.radiusMd,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
    },
    tbBtnOn: { borderColor: theme.teal600, backgroundColor: theme.teal50 },
    tbBtnTxt: { fontSize: 14, fontWeight: '700', color: theme.slate800 },
    tbBtnTxtOn: { color: theme.teal900 },
    tbBtnDanger: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: theme.radiusMd,
      borderWidth: 1,
      borderColor: theme.red600,
      backgroundColor: theme.surfaceElevated,
    },
    tbBtnDangerTxt: { fontSize: 14, fontWeight: '800', color: theme.red600 },
    list: { paddingHorizontal: theme.screenPadding, paddingBottom: 28, paddingTop: 4 },
    muted: { textAlign: 'center', color: theme.slate500, marginTop: 24, marginBottom: 24 },
    err: { color: theme.red600, margin: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  });
}

export default function CagesTabScreen() {
  const { colors: theme } = useAppTheme();
  const styles = useMemo(() => createCagesTabStyles(theme), [theme]);
  const router = useRouter();
  const { cages, loading, error } = useCages();
  const { pigeons, loading: lp } = usePigeons(false);
  const { couples, loading: lco } = useCouples(false);
  const [query, setQuery] = useState('');
  const [filterVoliere, setFilterVoliere] = useState<string>('ALL');
  const [filterStatut, setFilterStatut] = useState<'ALL' | CageStatut>('ALL');
  const [sortBy, setSortBy] = useState('voliere');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    void readCagesListPrefs().then((p) => {
      if (!alive) return;
      setSortBy(p.sortBy);
      setSortDir(p.sortDir);
      setFilterStatut((p.statut === 'ALL' || p.statut === 'LIBRE' || p.statut === 'OCCUPE_PIGEON' || p.statut === 'OCCUPE_COUPLE' ? p.statut : 'ALL') as 'ALL' | CageStatut);
      setFilterVoliere(p.voliere);
      setPrefsLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    void writeCagesListPrefs({
      sortBy,
      sortDir,
      statut: filterStatut,
      voliere: filterVoliere,
    });
  }, [prefsLoaded, sortBy, sortDir, filterStatut, filterVoliere]);

  const codesVoliere = useMergedVoliereCodes();

  const voliereFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Toutes les volières' },
      ...codesVoliere.map((code) => ({ value: code, label: `Volière ${code}` })),
    ],
    [codesVoliere],
  );

  const statutFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Tous les statuts' },
      { value: 'LIBRE', label: statutLabel.LIBRE },
      { value: 'OCCUPE_PIGEON', label: statutLabel.OCCUPE_PIGEON },
      { value: 'OCCUPE_COUPLE', label: statutLabel.OCCUPE_COUPLE },
    ],
    [],
  );

  useEffect(() => {
    if (filterVoliere !== 'ALL' && !codesVoliere.includes(filterVoliere)) {
      setFilterVoliere('ALL');
    }
  }, [codesVoliere, filterVoliere]);

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

  const qNorm = query.trim().toLowerCase();

  const sorted = useMemo(() => {
    const filtered = cages.filter((c) => {
      if (filterVoliere !== 'ALL' && (c.voliereCode ?? 'A') !== filterVoliere) return false;
      if (filterStatut !== 'ALL' && c.statut !== filterStatut) return false;
      if (!qNorm) return true;
      const hay = [c.numero, c.nom, c.description ?? '', c.voliereCode ?? 'A', statutLabel[c.statut]]
        .join(' ')
        .toLowerCase();
      return hay.includes(qNorm);
    });
    return [...filtered].sort((a, b) => compareRows(a, b, sortBy, sortDir));
  }, [cages, filterVoliere, filterStatut, qNorm, sortBy, sortDir]);

  const handleDeleteCage = useCallback((cage: Cage) => {
    if (cage.statut !== 'LIBRE') return;
    const label = `${cage.voliereCode ?? 'A'} · ${cage.numero}`;
    appFeedback.alert('Supprimer la cage', `Supprimer définitivement la cage ${label} ? Cette action est irréversible.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await supprimerCage(cage.id);
              setSelectedIds((prev) => prev.filter((id) => id !== cage.id));
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Suppression impossible';
              appFeedback.alert('Erreur', msg);
            }
          })();
        },
      },
    ]);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((m) => {
      if (m) setSelectedIds([]);
      return !m;
    });
  }, []);

  const toggleRowSelect = useCallback((cageId: string) => {
    setSelectedIds((prev) => (prev.includes(cageId) ? prev.filter((x) => x !== cageId) : [...prev, cageId]));
  }, []);

  const handleBulkDelete = useCallback(() => {
    const toDelete = sorted.filter((c) => selectedIds.includes(c.id) && c.statut === 'LIBRE');
    if (toDelete.length === 0) {
      appFeedback.alert('Sélection', 'Aucune cage libre dans la sélection. Touche les lignes vertes pour cocher.');
      return;
    }
    const labels = toDelete.map((c) => `${c.voliereCode ?? 'A'} · ${c.numero}`).join('\n');
    appFeedback.alert(
      'Supprimer plusieurs cages',
      `Supprimer définitivement ${toDelete.length} cage(s) libre(s) ?\n\n${labels}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const failed: string[] = [];
              for (const c of toDelete) {
                try {
                  await supprimerCage(c.id);
                } catch {
                  failed.push(c.id);
                }
              }
              setSelectedIds(failed);
              if (failed.length === 0) {
                setSelectionMode(false);
                appFeedback.success('Cages supprimées', `${toDelete.length} cage(s) supprimée(s).`);
              } else {
                appFeedback.alert(
                  'Erreurs partielles',
                  `${failed.length} suppression(s) en échec sur ${toDelete.length}. Les cages en erreur restent cochées.`,
                );
              }
            })();
          },
        },
      ],
    );
  }, [selectedIds, sorted]);

  const header = (
    <View style={styles.header}>
      <PageHeader description="Inventaire détaillé sur toutes les volières : recherche, filtres et tri. Touche le corps de la carte pour la fiche ; en bas à droite : modifier (icône), supprimer pour les cages libres (icône). Grille par volière : menu profil → Grille volière. Couples : onglet Volière ou Couples. Nouvelle cage : + en bas à droite." />
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher par n° cage, nom, description…"
      />
      <View style={styles.filtersRow}>
        <MobileLabeledSelect
          label="Volière"
          options={voliereFilterOptions}
          value={filterVoliere}
          onChange={setFilterVoliere}
        />
        <MobileLabeledSelect
          label="Statut"
          options={statutFilterOptions}
          value={filterStatut}
          onChange={(v) => setFilterStatut(v as 'ALL' | CageStatut)}
        />
      </View>
      <View style={styles.sortRow}>
        <Text style={styles.sortLab}>Tri</Text>
        {SORT_KEYS.map(({ id, label }) => (
          <Pressable key={id} onPress={() => setSortBy(id)} style={[styles.sChip, sortBy === id && styles.sChipOn]}>
            <Text style={[styles.sChipTxt, sortBy === id && styles.sChipTxtOn]}>{label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} style={styles.dirBtn}>
          <Text style={styles.dirTxt}>{sortDir === 'asc' ? '↑' : '↓'}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>
        {sorted.length} cage{sorted.length > 1 ? 's' : ''} · Volières : {codesVoliere.join(', ')}
      </Text>
      <View style={styles.toolbarRow}>
        <Pressable
          onPress={toggleSelectionMode}
          style={[styles.tbBtn, selectionMode && styles.tbBtnOn]}
          accessibilityRole="button"
          accessibilityLabel={selectionMode ? 'Quitter le mode sélection' : 'Mode sélection multiple'}
        >
          <Text style={[styles.tbBtnTxt, selectionMode && styles.tbBtnTxtOn]}>
            {selectionMode ? 'Annuler sélection' : 'Sélection multiple'}
          </Text>
        </Pressable>
        {selectionMode && selectedIds.length > 0 ? (
          <Pressable onPress={handleBulkDelete} style={styles.tbBtnDanger} accessibilityRole="button">
            <Text style={styles.tbBtnDangerTxt}>Supprimer ({selectedIds.length})</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <TabScreenFade>
    <View style={styles.root}>
      {loading || lp || lco ? (
        <View style={styles.center}>
          <AppLoadingView
            variant="embedded"
            loadingContext="cages"
            message="Chargement des cages…"
            subtitle="Grille, occupants et couples."
          />
        </View>
      ) : error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <>
          <FlatList
            data={sorted}
            keyExtractor={(c) => c.id}
            contentContainerStyle={[styles.list, { paddingBottom: FLOATING_ADD_LIST_PADDING_BOTTOM }]}
            ListHeaderComponent={header}
            ListEmptyComponent={<Text style={styles.muted}>Aucune cage pour ces filtres.</Text>}
            renderItem={({ item }) => {
            const pigeon = item.pigeonId ? pigeonById.get(item.pigeonId) ?? null : null;
            const couple = item.coupleId ? coupleById.get(item.coupleId) ?? null : null;
            const male = couple ? pigeonById.get(couple.maleId) ?? null : null;
            const femelle = couple ? pigeonById.get(couple.femelleId) ?? null : null;
            return (
              <CageListRow
                cage={item}
                pigeon={pigeon}
                male={male}
                femelle={femelle}
                statutLibelle={statutLabel[item.statut]}
                selectionMode={selectionMode}
                selected={selectedIds.includes(item.id)}
                onPress={() => {
                  if (selectionMode) {
                    if (item.statut === 'LIBRE') toggleRowSelect(item.id);
                    return;
                  }
                  router.push(`/(app)/cage/${item.id}`);
                }}
                onEditPress={() => router.push(`/(app)/cage/edit/${item.id}`)}
                onDeletePress={item.statut === 'LIBRE' ? () => handleDeleteCage(item) : undefined}
              />
            );
          }}
          />
          {!selectionMode ? (
            <FloatingAddButton
              onPress={() =>
                router.push({
                  pathname: '/(app)/cage/nouveau',
                  params: {
                    voliere: filterVoliere !== 'ALL' ? filterVoliere : codesVoliere[0] ?? 'A',
                  },
                })
              }
              accessibilityLabel="Nouvelle cage"
              icon={<LayoutGrid size={24} color={theme.white} strokeWidth={2.4} />}
            />
          ) : null}
        </>
      )}
    </View>
    </TabScreenFade>
  );
}

