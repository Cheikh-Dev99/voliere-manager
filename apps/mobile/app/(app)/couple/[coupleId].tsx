import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCages } from '@shared/hooks/useCages';
import { usePigeons } from '@shared/hooks/usePigeons';
import { obtenirCouple, rompreCouple } from '@shared/services/couplesService';
import type { Cage, Couple, Pigeon } from '@shared/types';

import { PigeonPhotoAvatar } from '../../../components/pigeons/PigeonPhotoAvatar';
import { AppLoadingView } from '../../../components/ui/AppLoadingView';
import { appFeedback } from '../../../lib/appFeedback';
import type { ShadowCardStyle, ThemeColors } from '../../../constants/palettes';
import { useAppTheme } from '../../../context/AppThemeContext';
import { useThemedStyles } from '../../../lib/useThemedStyles';
import { formatFirestoreDate } from '../../../utils/formatDate';

function normalizeId(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

function cageLabel(c: Cage | undefined): string {
  if (!c) return '—';
  return `${c.voliereCode ?? 'A'} · ${c.numero}${c.nom?.trim() ? ` — ${c.nom.trim()}` : ''}`;
}

export default function CoupleDetailScreen() {
  const { shadowCard } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { coupleId: coupleIdParam } = useLocalSearchParams<{ coupleId: string | string[] }>();
  const coupleId = useMemo(() => normalizeId(coupleIdParam), [coupleIdParam]);

  const { pigeons } = usePigeons(true);
  const { cages } = useCages();

  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rompuBusy, setRompuBusy] = useState(false);

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

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!coupleId) {
        setCouple(null);
        setError('Identifiant manquant.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const c = await obtenirCouple(coupleId);
        if (!alive) return;
        if (!c) {
          setCouple(null);
          setError('Couple introuvable.');
          return;
        }
        setCouple(c);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [coupleId]);

  const male = couple ? pigeonById.get(couple.maleId) : undefined;
  const femelle = couple ? pigeonById.get(couple.femelleId) : undefined;
  const cage = couple?.cageId ? cageById.get(couple.cageId) : undefined;

  const onRompre = useCallback(() => {
    if (!couple || couple.statut !== 'ACTIF') return;
    appFeedback.alert('Rompre le couple', 'Les cages seront mises à jour selon les règles métier. Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Rompre',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setRompuBusy(true);
            try {
              await rompreCouple(couple.id);
              appFeedback.success('Couple rompu', 'Les fiches et cages ont été mises à jour.');
              router.back();
            } catch (e) {
              appFeedback.alert('Erreur', e instanceof Error ? e.message : 'Échec');
            } finally {
              setRompuBusy(false);
            }
          })();
        },
      },
    ]);
  }, [couple, router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="couples"
          message="Chargement du couple…"
          subtitle="Pigeons et cage."
        />
      </View>
    );
  }

  if (error || !couple) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error ?? 'Introuvable'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const maleRef = male ?? { id: couple.maleId };
  const femelleRef = femelle ?? { id: couple.femelleId };

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={[styles.headCard, shadowCard]}>
        <View style={styles.pairRow}>
          <View style={styles.pairCol}>
            <PigeonPhotoAvatar pigeon={maleRef} size="md" circle />
            <Text style={styles.role}>Mâle</Text>
            <Text style={styles.mat}>{male?.matricule ?? '—'}</Text>
            <Text style={styles.nom} numberOfLines={2}>
              {male?.nom ?? ''}
            </Text>
          </View>
          <Text style={styles.plus}>+</Text>
          <View style={styles.pairCol}>
            <PigeonPhotoAvatar pigeon={femelleRef} size="md" circle />
            <Text style={styles.role}>Femelle</Text>
            <Text style={styles.mat}>{femelle?.matricule ?? '—'}</Text>
            <Text style={styles.nom} numberOfLines={2}>
              {femelle?.nom ?? ''}
            </Text>
          </View>
        </View>
        <View style={[styles.statutPill, couple.statut === 'ROMPU' && styles.statutPillOff]}>
          <Text style={[styles.statutTxt, couple.statut === 'ROMPU' && styles.statutTxtOff]}>
            {couple.statut === 'ACTIF' ? 'Couple actif' : 'Couple rompu'}
          </Text>
        </View>
      </View>

      <View style={[styles.block, shadowCard]}>
        <Text style={styles.section}>Informations</Text>
        <Row styles={styles} label="Début" value={formatFirestoreDate(couple.dateDebut, 'long')} />
        <Row
          styles={styles}
          label="Fin"
          value={couple.dateFin ? formatFirestoreDate(couple.dateFin, 'long') : '—'}
        />
        <Row styles={styles} label="Cage" value={cageLabel(cage)} />
        <Row styles={styles} label="Notes" value={couple.notes ?? ''} />
        <Row styles={styles} label="Créé le" value={formatFirestoreDate(couple.createdAt, 'long')} />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/pigeon/[pigeonId]', params: { pigeonId: couple.maleId } })}
        >
          <Text style={styles.actionTxt}>Fiche mâle</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push({ pathname: '/pigeon/[pigeonId]', params: { pigeonId: couple.femelleId } })}
        >
          <Text style={styles.actionTxt}>Fiche femelle</Text>
        </Pressable>
      </View>

      {couple.statut === 'ACTIF' ? (
        <Pressable
          style={[styles.dangerBtn, rompuBusy && styles.dangerBtnDis]}
          onPress={onRompre}
          disabled={rompuBusy}
          accessibilityRole="button"
          accessibilityLabel="Rompre le couple"
        >
          <Text style={styles.dangerTxt}>{rompuBusy ? 'Traitement…' : 'Rompre le couple'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLab}>{label}</Text>
      <Text style={styles.rowVal}>{value || '—'}</Text>
    </View>
  );
}

function createStyles(theme: ThemeColors, _shadowCard: ShadowCardStyle) {
  return StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'transparent' },
  err: { color: theme.red600, textAlign: 'center', marginBottom: 12, fontSize: 15 },
  backBtn: { padding: 12 },
  backTxt: { color: theme.teal700, fontWeight: '800', fontSize: 16 },
  scroll: { padding: theme.screenPadding, paddingBottom: 40, backgroundColor: 'transparent' },
  headCard: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 14,
  },
  pairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pairCol: { flex: 1, alignItems: 'center', minWidth: 0 },
  plus: { fontSize: 22, fontWeight: '900', color: theme.slate500, paddingHorizontal: 4 },
  role: { marginTop: 8, fontSize: 11, fontWeight: '800', color: theme.slate500, textTransform: 'uppercase' },
  mat: { marginTop: 4, fontSize: 15, fontWeight: '800', color: theme.slate900 },
  nom: { marginTop: 2, fontSize: 13, color: theme.slate600, textAlign: 'center' },
  statutPill: {
    marginTop: 14,
    alignSelf: 'center',
    backgroundColor: theme.emerald50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.teal100,
  },
  statutPillOff: { backgroundColor: theme.slate100, borderColor: theme.slate200 },
  statutTxt: { fontSize: 13, fontWeight: '800', color: theme.emerald900 },
  statutTxtOff: { color: theme.slate700 },
  block: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 14,
  },
  section: { fontSize: 14, fontWeight: '800', color: theme.slate800, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.slate200,
    gap: 12,
  },
  rowLab: { fontSize: 13, color: theme.slate500, fontWeight: '600', flex: 0.42 },
  rowVal: { fontSize: 14, color: theme.slate900, fontWeight: '600', flex: 0.58, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    backgroundColor: theme.teal600,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: 'center',
  },
  actionTxt: { color: theme.white, fontWeight: '800', fontSize: 15 },
  dangerBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: 'center',
  },
  dangerBtnDis: { opacity: 0.6 },
  dangerTxt: { color: '#b91c1c', fontWeight: '800', fontSize: 15 },
  });
}
