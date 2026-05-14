import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Egg,
  GitBranch,
  Heart,
  HeartCrack,
  History,
  LayoutGrid,
  MoveRight,
  Unlock,
  UserPlus,
  X,
} from 'lucide-react-native';

import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import { useCages } from '@shared/hooks/useCages';
import { useReproductionsByCouple } from '@shared/hooks/useReproductionsByCouple';
import {
  affecterCoupleACage,
  affecterPigeonACage,
  deplacerCoupleVersCage,
  deplacerPigeonVersCage,
  fetchCageOccupancyEvents,
  libererCage,
} from '@shared/services/cagesService';
import { rompreCouple } from '@shared/services/couplesService';
import type { Cage, CageOccupancyEvent, Couple, Pigeon } from '@shared/types';

import { appFeedback } from '../../lib/appFeedback';
import { theme, shadowCard } from '../../constants/theme';
import { AppLoadingView } from '../ui/AppLoadingView';
import { CageGenealogyTree } from '../genealogy/CageGenealogyTree';
import { formatCalendarDate, formatEventTime } from './cageDetailUtils';
import { PigeonPreviewCard } from './PigeonPreviewCard';

const PIGEON_STATUT_LABEL: Record<string, string> = {
  ACTIF: 'Actif',
  VENDU: 'Vendu',
  MORT: 'Mort',
  PERDU: 'Perdu',
};

type TabId = 'detail' | 'genealogy' | 'reproductions' | 'history';

type Props = {
  cage: Cage;
  onReload: () => Promise<void>;
};

export function CageDetailView({ cage, onReload }: Props) {
  const router = useRouter();
  const { pigeons } = usePigeons(true);
  const { couples } = useCouples(false);
  const { cages: allCages } = useCages();

  const [panelTab, setPanelTab] = useState<TabId>('detail');
  const [busy, setBusy] = useState(false);
  const [occEvents, setOccEvents] = useState<CageOccupancyEvent[]>([]);
  const [occLoading, setOccLoading] = useState(true);
  const [occError, setOccError] = useState<string | null>(null);

  const [pickPigeonOpen, setPickPigeonOpen] = useState(false);
  const [pickCoupleOpen, setPickCoupleOpen] = useState(false);
  const [pickMoveOpen, setPickMoveOpen] = useState(false);

  useEffect(() => {
    setPanelTab('detail');
  }, [cage.id]);

  useEffect(() => {
    let cancelled = false;
    setOccLoading(true);
    setOccError(null);
    void (async () => {
      try {
        const rows = await fetchCageOccupancyEvents(cage.id, 40);
        if (!cancelled) setOccEvents(rows);
      } catch (e) {
        if (!cancelled) setOccError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        if (!cancelled) setOccLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cage.id]);

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

  const pigeon = cage.pigeonId ? pigeonById.get(cage.pigeonId) ?? null : null;
  const couple = cage.coupleId ? coupleById.get(cage.coupleId) ?? null : null;
  const male = couple ? pigeonById.get(couple.maleId) ?? null : null;
  const femelle = couple ? pigeonById.get(couple.femelleId) ?? null : null;

  const showGenealogyTab = Boolean(
    (cage.statut === 'OCCUPE_PIGEON' && pigeon) || (cage.statut === 'OCCUPE_COUPLE' && male && femelle),
  );
  const showReproductionTab = Boolean(cage.statut === 'OCCUPE_COUPLE' && couple);

  const { reproductions: coupleReproductions, loading: reproLoading, error: reproError } =
    useReproductionsByCouple(showReproductionTab ? couple?.id : undefined);

  const occupiedPigeonIds = useMemo(() => {
    const s = new Set<string>();
    allCages.forEach((c) => {
      if (c.pigeonId) s.add(c.pigeonId);
      if (c.coupleId) {
        const cp = coupleById.get(c.coupleId);
        if (cp) {
          s.add(cp.maleId);
          s.add(cp.femelleId);
        }
      }
    });
    return s;
  }, [allCages, coupleById]);

  const pigeonsDisponibles = useMemo(
    () => pigeons.filter((p) => p.statut === 'ACTIF' && !p.deletedAt && !occupiedPigeonIds.has(p.id)),
    [pigeons, occupiedPigeonIds],
  );

  const coupleOptions = useMemo(
    () =>
      couples
        .filter((c) => c.statut === 'ACTIF' && !c.cageId)
        .map((c) => ({
          id: c.id,
          label: `${pigeonById.get(c.maleId)?.matricule ?? '?'} + ${pigeonById.get(c.femelleId)?.matricule ?? '?'}`,
        })),
    [couples, pigeonById],
  );

  const libreCagesForMove = useMemo(
    () => allCages.filter((c) => c.id !== cage.id && c.statut === 'LIBRE'),
    [allCages, cage.id],
  );

  const occupantsHorsActif: Pigeon[] = [];
  if (pigeon && pigeon.statut !== 'ACTIF') occupantsHorsActif.push(pigeon);
  if (male && male.statut !== 'ACTIF' && !occupantsHorsActif.some((p) => p.id === male.id)) occupantsHorsActif.push(male);
  if (femelle && femelle.statut !== 'ACTIF' && !occupantsHorsActif.some((p) => p.id === femelle.id))
    occupantsHorsActif.push(femelle);

  const titre = `Cage ${cage.numero}`;

  const runBusy = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await onReload();
    } catch (e) {
      appFeedback.alert('Erreur', e instanceof Error ? e.message : 'Échec');
    } finally {
      setBusy(false);
    }
  }, [onReload]);

  const onLiberer = () => {
    if (cage.statut === 'LIBRE') return;
    appFeedback.alert('Libérer la cage', 'Confirmer la libération ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Libérer',
        style: 'destructive',
        onPress: () => void runBusy(() => libererCage(cage.id)),
      },
    ]);
  };

  const onRompre = () => {
    if (!couple) return;
    appFeedback.alert('Rompre le couple', 'Les pigeons redeviennent disponibles selon les règles métier. Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rompre',
        style: 'destructive',
        onPress: () => void runBusy(async () => {
          await rompreCouple(couple.id);
        }),
      },
    ]);
  };

  const assignPigeon = async (pigeonId: string) => {
    setPickPigeonOpen(false);
    await runBusy(() => affecterPigeonACage(pigeonId, cage.id));
  };

  const assignCouple = async (coupleId: string) => {
    setPickCoupleOpen(false);
    await runBusy(() => affecterCoupleACage(coupleId, cage.id));
  };

  const moveTo = async (targetId: string) => {
    setPickMoveOpen(false);
    if (cage.statut === 'OCCUPE_PIGEON' && pigeon) {
      await runBusy(() => deplacerPigeonVersCage(pigeon.id, cage.id, targetId));
    } else if (cage.statut === 'OCCUPE_COUPLE' && couple) {
      await runBusy(() => deplacerCoupleVersCage(couple.id, cage.id, targetId));
    }
  };

  const tabs: { id: TabId; label: string; icon: ReactNode; show: boolean }[] = [
    { id: 'detail', label: 'Cage', icon: <LayoutGrid size={16} color={theme.slate700} />, show: true },
    {
      id: 'genealogy',
      label: 'Généalogie',
      icon: <GitBranch size={16} color={theme.teal800} />,
      show: showGenealogyTab,
    },
    {
      id: 'reproductions',
      label: 'Portées',
      icon: <Egg size={16} color={theme.teal800} />,
      show: showReproductionTab,
    },
    { id: 'history', label: 'Occupation', icon: <History size={16} color={theme.slate700} />, show: true },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled style={{ flex: 1 }}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{titre}</Text>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Fermer">
          <X size={22} color={theme.slate600} />
        </Pressable>
      </View>

      {cage.description?.trim() ? (
        <View style={styles.descBlock}>
          <Text style={styles.descK}>DESCRIPTION</Text>
          <Text style={styles.descTxt}>{cage.description.trim()}</Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar} nestedScrollEnabled>
        {tabs
          .filter((t) => t.show)
          .map((t) => {
            const on = panelTab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setPanelTab(t.id)}
                style={[styles.tab, on && styles.tabOn]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                {t.icon}
                <Text style={[styles.tabTxt, on && styles.tabTxtOn]} numberOfLines={1}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
      </ScrollView>

      {panelTab === 'detail' ? (
        <View style={styles.panel}>
          {cage.statut === 'LIBRE' ? <Text style={[styles.badge, styles.badgeLibre]}>Libre</Text> : null}
          {cage.statut === 'OCCUPE_PIGEON' ? (
            <Text style={[styles.badge, styles.badgePigeon]}>Occupée (1 pigeon)</Text>
          ) : null}
          {cage.statut === 'OCCUPE_COUPLE' ? (
            <Text style={[styles.badge, styles.badgeCouple]}>Occupée par un couple</Text>
          ) : null}

          {occupantsHorsActif.length > 0 ? (
            <View style={styles.warnBox}>
              <View style={styles.warnHead}>
                <AlertTriangle size={18} color="#b45309" />
                <Text style={styles.warnTitle}>Attention : occupant(s) sans statut « Actif »</Text>
              </View>
              {occupantsHorsActif.map((p) => (
                <Text key={p.id} style={styles.warnLi}>
                  • {p.matricule} ({p.nom}) — {PIGEON_STATUT_LABEL[p.statut] ?? p.statut}
                </Text>
              ))}
            </View>
          ) : null}

          {cage.statut === 'OCCUPE_PIGEON' && pigeon ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pigeon</Text>
              <PigeonPreviewCard
                pigeon={pigeon}
                roleLabel={pigeon.sexe === 'MALE' ? 'Mâle' : 'Femelle'}
                onPressCard={() => router.push(`/(app)/pigeon/${pigeon.id}`)}
                onPressHealth={() => router.push(`/(app)/pigeon/${pigeon.id}/sante`)}
                healthLinkLabel="Ouvrir le carnet de santé"
              />
            </View>
          ) : null}

          {cage.statut === 'OCCUPE_COUPLE' && male && femelle ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pigeons</Text>
              <View style={{ gap: 12 }}>
                <PigeonPreviewCard
                  pigeon={male}
                  roleLabel="Mâle"
                  onPressCard={() => router.push(`/(app)/pigeon/${male.id}`)}
                  onPressHealth={() => router.push(`/(app)/pigeon/${male.id}/sante`)}
                  healthLinkLabel="Carnet de santé"
                />
                <PigeonPreviewCard
                  pigeon={femelle}
                  roleLabel="Femelle"
                  onPressCard={() => router.push(`/(app)/pigeon/${femelle.id}`)}
                  onPressHealth={() => router.push(`/(app)/pigeon/${femelle.id}/sante`)}
                  healthLinkLabel="Carnet de santé"
                />
              </View>
              {couple?.notes?.trim() ? (
                <View style={styles.coupleNotes}>
                  <Text style={styles.coupleNotesK}>NOTES DU COUPLE</Text>
                  <Text style={styles.coupleNotesTxt}>{couple.notes.trim()}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.metaLine}>
            <Text style={styles.metaK}>Nom </Text>
            {cage.nom}
          </Text>
          <Text style={styles.metaLine}>
            <Text style={styles.metaK}>Superficie </Text>
            {cage.superficie} m²
          </Text>

          <Text style={styles.actionsK}>Actions</Text>

          {cage.statut === 'LIBRE' ? (
            <>
              <Pressable
                style={[styles.actionBtn, styles.actionPigeon]}
                onPress={() => setPickPigeonOpen(true)}
                disabled={busy}
              >
                <UserPlus size={20} color="#0369a1" />
                <Text style={styles.actionPigeonTxt}>Affecter un pigeon</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionCouple]}
                onPress={() => setPickCoupleOpen(true)}
                disabled={busy}
              >
                <Heart size={20} color="#b45309" />
                <Text style={styles.actionCoupleTxt}>Affecter un couple</Text>
              </Pressable>
            </>
          ) : null}

          {cage.statut === 'OCCUPE_COUPLE' && couple ? (
            <Pressable style={[styles.actionBtn, styles.actionRompre]} onPress={onRompre} disabled={busy}>
              <HeartCrack size={20} color="#92400e" />
              <Text style={styles.actionRompreTxt}>Rompre le couple</Text>
            </Pressable>
          ) : null}

          {cage.statut !== 'LIBRE' ? (
            <Pressable
              style={[styles.actionBtn, styles.actionMove]}
              onPress={() => {
                if (libreCagesForMove.length === 0) {
                  appFeedback.alert('Déplacement', 'Aucune cage libre disponible pour un déplacement.');
                  return;
                }
                setPickMoveOpen(true);
              }}
              disabled={busy}
            >
              <MoveRight size={20} color={theme.teal700} />
              <Text style={styles.actionMoveTxt}>Déplacer vers une autre cage</Text>
            </Pressable>
          ) : null}

          {cage.statut !== 'LIBRE' ? (
            <Pressable style={[styles.actionBtn, styles.actionLib, busy && styles.opacityDim]} onPress={onLiberer} disabled={busy}>
              <Unlock size={20} color="#be123c" />
              <Text style={styles.actionLibTxt}>{busy ? '…' : 'Libérer la cage'}</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.editOutline, busy && styles.opacityDim]}
            onPress={() => router.push(`/(app)/cage/edit/${cage.id}`)}
            disabled={busy}
          >
            <Text style={styles.editOutlineTxt}>Modifier la cage</Text>
          </Pressable>
        </View>
      ) : null}

      {panelTab === 'genealogy' && showGenealogyTab ? (
        <View style={styles.panel}>
          <CageGenealogyTree
            mode={cage.statut === 'OCCUPE_COUPLE' && male && femelle ? 'couple' : 'solo'}
            pigeon={pigeon}
            male={male}
            femelle={femelle}
            pigeonById={pigeonById}
          />
        </View>
      ) : null}

      {panelTab === 'reproductions' && showReproductionTab ? (
        <View style={styles.panel}>
          {reproError ? <Text style={styles.errTxt}>{reproError}</Text> : null}
          <Pressable
            style={[styles.actionBtn, styles.actionRepro]}
            onPress={() =>
              router.push({
                pathname: '/(app)/reproduction/nouveau',
                params: { coupleId: couple!.id },
              })
            }
          >
            <Egg size={20} color={theme.teal900} />
            <Text style={styles.actionReproTxt}>Nouvelle reproduction (ce couple)</Text>
          </Pressable>
          {reproLoading ? (
            <AppLoadingView
              variant="inline"
              loadingContext="reproduction"
              message="Chargement des portées…"
              style={{ marginTop: 16, alignSelf: 'flex-start' }}
            />
          ) : coupleReproductions.length === 0 ? (
            <Text style={styles.muted}>Aucune portée enregistrée pour ce couple.</Text>
          ) : (
            <View style={{ marginTop: 12, gap: 10 }}>
              {coupleReproductions.map((r) => (
                <View key={r.id} style={styles.reproCard}>
                  <Text style={styles.reproK}>Ponte · {formatCalendarDate(r.datePonte)}</Text>
                  <Text style={styles.reproBody}>
                    Œufs : {r.nombreOeufs} · Jeunes : {r.nombrePigeonneaux}
                  </Text>
                  {r.dateEclosion ? (
                    <Text style={styles.reproSub}>Éclosion : {formatCalendarDate(r.dateEclosion)}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          <Pressable style={{ marginTop: 16 }} onPress={() => router.push('/(app)/(tabs)/reproductions')}>
            <Text style={styles.inlineLink}>Voir toutes les reproductions</Text>
          </Pressable>
        </View>
      ) : null}

      {panelTab === 'history' ? (
        <View style={styles.panel}>
          <Text style={styles.help}>
            Mouvements et affectations (pas le carnet santé). Aperçu des 40 derniers événements.
          </Text>
          {occError ? <Text style={styles.errTxt}>{occError}</Text> : null}
          {occLoading ? (
            <AppLoadingView
              variant="inline"
              loadingContext="cages"
              message="Chargement de l'historique…"
              style={{ marginVertical: 16, alignSelf: 'flex-start' }}
            />
          ) : null}
          {!occLoading && occEvents.length === 0 ? (
            <Text style={styles.muted}>Aucun événement pour l’instant.</Text>
          ) : null}
          {!occLoading && occEvents.length > 0 ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              {occEvents.map((ev) => (
                <View key={ev.id} style={styles.occCard}>
                  <Text style={styles.occTime}>{formatEventTime(ev.createdAt)}</Text>
                  <Text style={styles.occSum}>{ev.summary}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <Modal visible={pickPigeonOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Choisir un pigeon</Text>
              <Pressable onPress={() => setPickPigeonOpen(false)} accessibilityLabel="Fermer">
                <X size={22} color={theme.slate600} />
              </Pressable>
            </View>
            <FlatList
              data={pigeonsDisponibles}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 360 }}
              ListEmptyComponent={<Text style={styles.muted}>Aucun pigeon actif disponible.</Text>}
              renderItem={({ item }) => (
                <Pressable style={styles.pickRow} onPress={() => void assignPigeon(item.id)}>
                  <Text style={styles.pickMat}>{item.matricule}</Text>
                  <Text style={styles.pickNom}>{item.nom}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={pickCoupleOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Choisir un couple</Text>
              <Pressable onPress={() => setPickCoupleOpen(false)}>
                <X size={22} color={theme.slate600} />
              </Pressable>
            </View>
            <FlatList
              data={coupleOptions}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 360 }}
              ListEmptyComponent={<Text style={styles.muted}>Aucun couple actif sans cage.</Text>}
              renderItem={({ item }) => (
                <Pressable style={styles.pickRow} onPress={() => void assignCouple(item.id)}>
                  <Text style={styles.pickMat}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={pickMoveOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Cage de destination</Text>
              <Pressable onPress={() => setPickMoveOpen(false)}>
                <X size={22} color={theme.slate600} />
              </Pressable>
            </View>
            <FlatList
              data={libreCagesForMove}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <Pressable style={styles.pickRow} onPress={() => void moveTo(item.id)}>
                  <Text style={styles.pickMat}>
                    {item.voliereCode ?? 'A'} · {item.numero}
                  </Text>
                  <Text style={styles.pickNom}>{item.nom}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: theme.slate900 },
  iconBtn: { padding: 8, borderRadius: theme.radiusMd },
  descBlock: { marginBottom: 14 },
  descK: { fontSize: 10, fontWeight: '700', color: theme.slate500, letterSpacing: 0.8 },
  descTxt: { marginTop: 6, fontSize: 14, color: theme.slate700, lineHeight: 21 },
  tabBar: { flexDirection: 'row', gap: 8, paddingVertical: 4, marginBottom: 12 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.slate50,
    borderWidth: 1,
    borderColor: theme.slate200,
  },
  tabOn: { backgroundColor: theme.white, borderColor: theme.slate200, ...shadowCard },
  tabTxt: { fontSize: 13, fontWeight: '600', color: theme.slate600, maxWidth: 120 },
  tabTxtOn: { color: theme.slate900 },
  panel: { marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeLibre: { backgroundColor: '#d1fae5', color: '#065f46' },
  badgePigeon: { backgroundColor: '#ffe4e6', color: '#9f1239' },
  badgeCouple: { backgroundColor: '#fef3c7', color: '#92400e' },
  warnBox: {
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    padding: 12,
    marginBottom: 14,
  },
  warnHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warnTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#92400e' },
  warnLi: { marginTop: 6, fontSize: 12, color: '#78350f', lineHeight: 18 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.slate700, marginBottom: 10 },
  coupleNotes: {
    marginTop: 14,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: 'rgba(254, 243, 199, 0.55)',
    padding: 12,
  },
  coupleNotesK: { fontSize: 11, fontWeight: '800', color: '#92400e', letterSpacing: 0.6 },
  coupleNotesTxt: { marginTop: 8, fontSize: 14, color: '#78350f', lineHeight: 21 },
  metaLine: { fontSize: 14, color: theme.slate700, marginBottom: 4 },
  metaK: { color: theme.slate500, fontWeight: '600' },
  actionsK: { marginTop: 20, marginBottom: 10, fontSize: 14, fontWeight: '700', color: theme.slate700 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 48,
    borderRadius: theme.radiusLg,
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  actionPigeon: { borderWidth: 2, borderColor: '#0ea5e9', backgroundColor: theme.white },
  actionPigeonTxt: { fontSize: 15, fontWeight: '700', color: '#0369a1' },
  actionCouple: { borderWidth: 2, borderColor: '#f59e0b', backgroundColor: theme.white },
  actionCoupleTxt: { fontSize: 15, fontWeight: '700', color: '#92400e' },
  actionRompre: { borderWidth: 2, borderColor: '#d97706', backgroundColor: '#fffbeb' },
  actionRompreTxt: { fontSize: 15, fontWeight: '700', color: '#78350f' },
  actionMove: { borderWidth: 2, borderColor: theme.teal600, backgroundColor: theme.white },
  actionMoveTxt: { fontSize: 15, fontWeight: '700', color: theme.teal800 },
  actionLib: { borderWidth: 2, borderColor: '#fb7185', backgroundColor: theme.white },
  actionLibTxt: { fontSize: 15, fontWeight: '700', color: '#be123c' },
  actionRepro: { borderWidth: 2, borderColor: theme.teal100, backgroundColor: theme.teal50 },
  actionReproTxt: { fontSize: 15, fontWeight: '700', color: theme.teal900 },
  editOutline: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.slate200,
    borderRadius: theme.radiusLg,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: theme.slate50,
  },
  editOutlineTxt: { fontSize: 15, fontWeight: '700', color: theme.slate800 },
  opacityDim: { opacity: 0.55 },
  help: { fontSize: 13, color: theme.slate600, lineHeight: 20, marginBottom: 12 },
  linkRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.teal50,
    borderWidth: 1,
    borderColor: theme.teal100,
    marginBottom: 8,
  },
  linkRowTxt: { fontSize: 15, fontWeight: '700', color: theme.teal800 },
  reproCard: {
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.slate100,
    backgroundColor: theme.slate50,
    padding: 12,
  },
  reproK: { fontSize: 11, fontWeight: '700', color: theme.slate500, letterSpacing: 0.5 },
  reproBody: { marginTop: 6, fontSize: 14, color: theme.slate800 },
  reproSub: { marginTop: 4, fontSize: 13, color: theme.slate600 },
  inlineLink: { fontSize: 13, fontWeight: '700', color: theme.teal700, textDecorationLine: 'underline' },
  occCard: {
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.slate100,
    backgroundColor: theme.slate50,
    padding: 10,
  },
  occTime: { fontSize: 11, fontWeight: '600', color: theme.slate500 },
  occSum: { marginTop: 4, fontSize: 14, color: theme.slate800 },
  muted: { fontSize: 14, color: theme.slate500, marginVertical: 8 },
  errTxt: { color: theme.red600, marginBottom: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  modalCard: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: '80%',
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.slate900 },
  pickRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.slate200,
  },
  pickMat: { fontSize: 16, fontWeight: '800', color: theme.slate900 },
  pickNom: { fontSize: 14, color: theme.slate600, marginTop: 2 },
});
