import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Home, LayoutGrid, X } from 'lucide-react-native';

import type { Cage, Couple, Pigeon } from '@shared/types';
import { useCages } from '@shared/hooks/useCages';
import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import { creerCoupleParGlissement } from '@shared/services/couplesService';
import {
  cageMatchesQuery,
  compareCages,
} from '@shared/utils/voliereCageList';

import { appFeedback } from '../../../lib/appFeedback';
import { CageGridCell } from '../../../components/cages/CageGridCell';
import { EmptyStateCard } from '../../../components/layout/EmptyStateCard';
import { PageHeader } from '../../../components/layout/PageHeader';
import { TabHeaderTitle } from '../../../components/layout/TabHeaderTitle';
import { MobileLabeledSelect } from '../../../components/ui/MobileLabeledSelect';
import { SearchField } from '../../../components/ui/SearchField';
import { AppLoadingView } from '../../../components/ui/AppLoadingView';
import type { ThemeColors } from '../../../constants/palettes';
import { useAppTheme } from '../../../context/AppThemeContext';
import { useMergedVoliereCodes } from '../../../hooks/useMergedVoliereCodes';

const FILTRES: { id: string; label: string }[] = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'LIBRE', label: 'Libres' },
  { id: 'OCCUPE_PIGEON', label: '1 pigeon' },
  { id: 'OCCUPE_COUPLE', label: 'Couples' },
];

function createVoliereIndexStyles(theme: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
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
    filtersRow: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      width: '100%',
      gap: 10,
      alignItems: 'flex-start',
      marginTop: 4,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    err: { color: theme.red600, padding: 16, textAlign: 'center' },
    list: {
      paddingHorizontal: theme.screenPadding,
      /** Marge basse sans FAB : évite que la dernière ligne soit masquée par la barre d’onglets. */
      paddingBottom: 80,
      paddingTop: 4,
    },
    gridRow: { gap: 10, marginBottom: 10, justifyContent: 'space-between' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.surfaceElevated,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 28,
      maxHeight: '85%',
    },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: theme.slate900 },
    modalHint: { fontSize: 13, color: theme.slate600, lineHeight: 18, marginBottom: 12 },
    pickRow: {
      paddingVertical: 14,
      paddingHorizontal: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    pickMat: { fontSize: 16, fontWeight: '700', color: theme.slate900 },
    pickNom: { fontSize: 13, color: theme.slate600, marginTop: 4 },
  });
}

export default function VoliereTabScreen() {
  const { colors: theme } = useAppTheme();
  const styles = useMemo(() => createVoliereIndexStyles(theme), [theme]);
  const router = useRouter();
  const navigation = useNavigation();
  const { cages, loading: lc, error: ec } = useCages();
  const { pigeons, loading: lp } = usePigeons(true);
  const { couples, loading: lco } = useCouples(false);

  const [voliereCode, setVoliereCode] = useState('A');
  const [filtre, setFiltre] = useState('ALL');
  const [query, setQuery] = useState('');
  const [couplePickOpen, setCouplePickOpen] = useState(false);
  const [couplePickSourcePid, setCouplePickSourcePid] = useState<string | null>(null);
  const [couplePickTargets, setCouplePickTargets] = useState<Cage[]>([]);
  const [coupleSubmitting, setCoupleSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <TabHeaderTitle Icon={Home} label={`Volière ${voliereCode}`} />,
    });
  }, [navigation, voliereCode]);

  const pigeonById = useMemo(() => {
    const m = new Map<string, Pigeon>();
    pigeons.forEach((p) => {
      m.set(p.id, p);
    });
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

  const pigeonDansCoupleActif = useMemo(() => {
    const s = new Set<string>();
    for (const c of couples) {
      if (c.statut !== 'ACTIF') continue;
      s.add(c.maleId);
      s.add(c.femelleId);
    }
    return s;
  }, [couples]);

  const canDropPourCouple = useCallback(
    (dragId: string, cage: Cage) => {
      if (!dragId || !cage || cage.statut !== 'OCCUPE_PIGEON' || !cage.pigeonId) return false;
      if (dragId === cage.pigeonId) return false;
      const a = pigeonById.get(dragId);
      const b = pigeonById.get(cage.pigeonId);
      if (!a || !b) return false;
      if (a.statut !== 'ACTIF' || b.statut !== 'ACTIF') return false;
      if (a.sexe === b.sexe) return false;
      if (pigeonDansCoupleActif.has(dragId) || pigeonDansCoupleActif.has(cage.pigeonId)) return false;
      return true;
    },
    [pigeonById, pigeonDansCoupleActif],
  );

  const codesVoliere = useMergedVoliereCodes();

  const voliereSelectOptions = useMemo(
    () =>
      codesVoliere.length > 0
        ? codesVoliere.map((code) => ({ value: code, label: `Volière ${code}` }))
        : [{ value: 'A', label: 'Volière A' }],
    [codesVoliere],
  );

  const filtreSelectOptions = useMemo(
    () => FILTRES.map((f) => ({ value: f.id, label: f.label })),
    [],
  );

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

  const loading = lc || lp || lco;
  const err = ec;
  const count = rows.length;

  const runCoupleMerge = useCallback(
    async (sourcePid: string, target: Cage) => {
      if (!canDropPourCouple(sourcePid, target)) return;
      setCoupleSubmitting(true);
      try {
        await creerCoupleParGlissement({
          pigeonGlissantId: sourcePid,
          cageCibleId: target.id,
        });
        setCouplePickOpen(false);
        setCouplePickSourcePid(null);
        setCouplePickTargets([]);
        appFeedback.alert('Succès', 'Couple créé — la cage cible affiche maintenant le couple.');
      } catch (e) {
        appFeedback.alert('Erreur', e instanceof Error ? e.message : 'Impossible de créer le couple');
      } finally {
        setCoupleSubmitting(false);
      }
    },
    [canDropPourCouple],
  );

  const onDragHandleForCage = useCallback(
    (cage: Cage) => {
      const pid = cage.pigeonId;
      if (!pid || cage.statut !== 'OCCUPE_PIGEON') return;
      const targets = rows.filter((c) => canDropPourCouple(pid, c));
      if (targets.length === 0) {
        appFeedback.alert(
          'Aucune cible',
          'Aucune autre cage sur cet écran avec un pigeon seul du sexe opposé et libre (non déjà en couple). Utilise le filtre « Toutes » ou change de volière si besoin.',
        );
        return;
      }
      if (targets.length === 1) {
        const t = targets[0]!;
        const src = pigeonById.get(pid);
        const other = t.pigeonId ? pigeonById.get(t.pigeonId) : null;
        appFeedback.alert(
          'Former un couple',
          `Fusionner ${src?.matricule ?? '…'} avec la cage ${t.numero} (${other?.matricule ?? '…'}) ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Confirmer', onPress: () => void runCoupleMerge(pid, t) },
          ],
        );
        return;
      }
      setCouplePickSourcePid(pid);
      setCouplePickTargets(targets);
      setCouplePickOpen(true);
    },
    [rows, canDropPourCouple, pigeonById, runCoupleMerge],
  );

  const closeCouplePickModal = useCallback(() => {
    if (coupleSubmitting) return;
    setCouplePickOpen(false);
    setCouplePickSourcePid(null);
    setCouplePickTargets([]);
  }, [coupleSubmitting]);

  const listHeader = (
    <View style={styles.headerBlock}>
      <PageHeader description="Légende : vert libre, rose occupée (1 pigeon), ambre couple. Couple rapide : touche la poignée sur une cage « 1 pigeon » — une cible compatible ouvre une confirmation ; plusieurs cibles ouvrent une liste. Nouvelle cage : onglet Cages, bouton + en bas à droite.">
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
      </PageHeader>

      <View style={styles.filtersRow}>
        <MobileLabeledSelect
          label="Volière"
          options={voliereSelectOptions}
          value={voliereCode}
          onChange={setVoliereCode}
        />
        <MobileLabeledSelect
          label="Vue"
          options={filtreSelectOptions}
          value={filtre}
          onChange={setFiltre}
        />
      </View>

      <Text style={[styles.fieldLab, { marginTop: 12 }]}>Recherche</Text>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher par n° cage, nom, description…"
      />
    </View>
  );

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          <AppLoadingView
            variant="embedded"
            loadingContext="cages"
            message="Chargement de la volière…"
            subtitle="Grille, occupants et couples."
          />
        </View>
      ) : err ? (
        <Text style={styles.err}>{err}</Text>
      ) : (
        <Fragment>
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.list}
            removeClippedSubviews={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <Fragment>
                {listHeader}
                {!rows.length ? (
                  <EmptyStateCard
                    icon={<LayoutGrid size={28} color={theme.teal700} strokeWidth={2} />}
                    title={`Aucune cage pour cette volière (${voliereCode}).`}
                    hint="Va dans l’onglet Cages et touche le bouton + en bas à droite pour créer une cage (y compris par lot). Tu peux aussi changer de code volière dans l’en-tête."
                  />
                ) : null}
              </Fragment>
            }
            renderItem={({ item }) => {
            const pigeon = item.pigeonId ? pigeonById.get(item.pigeonId) ?? null : null;
            const couple = item.coupleId ? coupleById.get(item.coupleId) ?? null : null;
            const male = couple ? pigeonById.get(couple.maleId) ?? null : null;
            const femelle = couple ? pigeonById.get(couple.femelleId) ?? null : null;
            return (
              <CageGridCell
                cage={item}
                pigeon={pigeon}
                male={male}
                femelle={femelle}
                onPress={() => {
                  if (coupleSubmitting) return;
                  router.push(`/(app)/cage/${item.id}`);
                }}
                onDragHandlePress={
                  item.statut === 'OCCUPE_PIGEON' && item.pigeonId
                    ? () => {
                        if (coupleSubmitting) return;
                        onDragHandleForCage(item);
                      }
                    : undefined
                }
              />
            );
          }}
          />
          <Modal visible={couplePickOpen} animationType="slide" transparent onRequestClose={closeCouplePickModal}>
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <View style={styles.modalHead}>
                  <Text style={styles.modalTitle}>Cage cible pour le couple</Text>
                  <Pressable onPress={closeCouplePickModal} accessibilityLabel="Fermer" hitSlop={12}>
                    <X size={22} color={theme.slate600} />
                  </Pressable>
                </View>
                <Text style={styles.modalHint}>
                  Choisis la cage qui contient le pigeon du sexe opposé. Le pigeon que tu déplaces quittera sa cage
                  actuelle.
                </Text>
                {coupleSubmitting ? (
                  <AppLoadingView
                    variant="inline"
                    loadingContext="couples"
                    message="Création du couple…"
                    style={{ marginVertical: 16, alignSelf: 'center' }}
                  />
                ) : (
                  <FlatList
                    data={couplePickTargets}
                    keyExtractor={(c) => c.id}
                    style={{ maxHeight: 360 }}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item: c }) => {
                      const otherPid = c.pigeonId;
                      const other = otherPid ? pigeonById.get(otherPid) : null;
                      const srcPid = couplePickSourcePid;
                      return (
                        <Pressable
                          style={styles.pickRow}
                          onPress={() => {
                            if (!srcPid) return;
                            void runCoupleMerge(srcPid, c);
                          }}
                        >
                          <Text style={styles.pickMat}>{c.numero}</Text>
                          <Text style={styles.pickNom}>
                            {other ? `${other.matricule} — ${other.nom}` : '—'}
                          </Text>
                        </Pressable>
                      );
                    }}
                  />
                )}
              </View>
            </View>
          </Modal>
        </Fragment>
      )}
    </View>
  );
}

