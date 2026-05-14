import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { usePigeons } from '@shared/hooks/usePigeons';
import { obtenirCouple } from '@shared/services/couplesService';
import { obtenirReproduction } from '@shared/services/reproductionsService';
import type { Couple, Pigeon, Reproduction } from '@shared/types';

import { PigeonPhotoAvatar } from '../../../components/pigeons/PigeonPhotoAvatar';
import { AppLoadingView } from '../../../components/ui/AppLoadingView';
import { theme, shadowCard } from '../../../constants/theme';
import { formatFirestoreDate } from '../../../utils/formatDate';

function normalizeId(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLab}>{label}</Text>
      <Text style={styles.rowVal}>{value || '—'}</Text>
    </View>
  );
}

export default function ReproductionDetailScreen() {
  const router = useRouter();
  const { reproductionId: ridParam } = useLocalSearchParams<{ reproductionId: string | string[] }>();
  const reproductionId = useMemo(() => normalizeId(ridParam), [ridParam]);

  const { pigeons } = usePigeons(true);

  const [reproduction, setReproduction] = useState<Reproduction | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pigeonById = useMemo(() => {
    const m = new Map<string, Pigeon>();
    pigeons.forEach((p) => m.set(p.id, p));
    return m;
  }, [pigeons]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!reproductionId) {
        setReproduction(null);
        setCouple(null);
        setError('Identifiant manquant.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const r = await obtenirReproduction(reproductionId);
        if (!alive) return;
        if (!r) {
          setReproduction(null);
          setCouple(null);
          setError('Reproduction introuvable.');
          return;
        }
        setReproduction(r);
        const c = await obtenirCouple(r.coupleId);
        if (!alive) return;
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
  }, [reproductionId]);

  const male = couple ? pigeonById.get(couple.maleId) : undefined;
  const femelle = couple ? pigeonById.get(couple.femelleId) : undefined;
  const ids = reproduction?.pigeonneauxIds ?? [];

  if (loading) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="reproduction"
          message="Chargement de la portée…"
          subtitle="Couple et pigeonneaux."
        />
      </View>
    );
  }

  if (error || !reproduction) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error ?? 'Introuvable'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const maleRef = couple ? male ?? { id: couple.maleId } : null;
  const femelleRef = couple ? femelle ?? { id: couple.femelleId } : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={[styles.headCard, shadowCard]}>
        <Text style={styles.h1}>Portée</Text>
        <Text style={styles.subH}>Ponte {formatFirestoreDate(reproduction.datePonte, 'long')}</Text>
        {couple ? (
          <View style={styles.pairRow}>
            <View style={styles.pairMini}>
              {maleRef ? <PigeonPhotoAvatar pigeon={maleRef} size="sm" circle /> : null}
              <Text style={styles.miniMat} numberOfLines={1}>
                {male?.matricule ?? '—'}
              </Text>
            </View>
            <Text style={styles.plus}>+</Text>
            <View style={styles.pairMini}>
              {femelleRef ? <PigeonPhotoAvatar pigeon={femelleRef} size="sm" circle /> : null}
              <Text style={styles.miniMat} numberOfLines={1}>
                {femelle?.matricule ?? '—'}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.warnCouple}>Couple introuvable (id conservé en base).</Text>
        )}
      </View>

      <View style={[styles.block, shadowCard]}>
        <Text style={styles.section}>Détail</Text>
        <Row
          label="Éclosion"
          value={reproduction.dateEclosion ? formatFirestoreDate(reproduction.dateEclosion, 'long') : '—'}
        />
        <Row label="Œufs" value={String(reproduction.nombreOeufs)} />
        <Row label="Pigeonneaux (nombre déclaré)" value={String(reproduction.nombrePigeonneaux)} />
        <Row label="Notes" value={reproduction.notes ?? ''} />
        <Row label="Enregistré le" value={formatFirestoreDate(reproduction.createdAt, 'long')} />
      </View>

      <Text style={styles.sectionOut}>Pigeonneaux liés</Text>
      <Text style={styles.hint}>Fiches rattachées à cette portée ({ids.length}).</Text>
      {ids.length === 0 ? (
        <View style={[styles.emptyBox, shadowCard]}>
          <Text style={styles.emptyTxt}>Aucun pigeonneau lié par identifiant.</Text>
        </View>
      ) : (
        ids.map((pid) => {
          const p = pigeonById.get(pid);
          const ref = p ?? { id: pid };
          return (
            <Pressable
              key={pid}
              style={({ pressed }) => [styles.pigRow, shadowCard, pressed && styles.pigRowIn]}
              onPress={() => router.push({ pathname: '/pigeon/[pigeonId]', params: { pigeonId: pid } })}
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir fiche ${p?.matricule ?? pid}`}
            >
              <PigeonPhotoAvatar pigeon={ref} size="sm" />
              <View style={styles.pigTxt}>
                <Text style={styles.pigMat}>{p?.matricule ?? pid.slice(0, 8) + '…'}</Text>
                <Text style={styles.pigNom} numberOfLines={1}>
                  {p?.nom ?? 'Fiche pigeon'}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}

      {couple ? (
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => router.push({ pathname: '/couple/[coupleId]', params: { coupleId: couple.id } })}
        >
          <Text style={styles.secondaryBtnTxt}>Voir la fiche couple</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'transparent' },
  err: { color: theme.red600, textAlign: 'center', marginBottom: 12, fontSize: 15 },
  backBtn: { padding: 12 },
  backTxt: { color: theme.teal700, fontWeight: '800', fontSize: 16 },
  scroll: { padding: theme.screenPadding, paddingBottom: 40, backgroundColor: 'transparent' },
  headCard: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 14,
  },
  h1: { fontSize: 20, fontWeight: '900', color: theme.slate900 },
  subH: { marginTop: 6, fontSize: 14, color: theme.slate600, fontWeight: '600' },
  pairRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 },
  pairMini: { alignItems: 'center', minWidth: 72 },
  plus: { fontSize: 18, fontWeight: '800', color: theme.slate500 },
  miniMat: { marginTop: 6, fontSize: 13, fontWeight: '800', color: theme.slate800, maxWidth: 100 },
  warnCouple: { marginTop: 12, fontSize: 13, color: theme.amber950 },
  block: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 16,
  },
  section: { fontSize: 14, fontWeight: '800', color: theme.slate800, marginBottom: 10 },
  sectionOut: { fontSize: 15, fontWeight: '800', color: theme.slate900, marginBottom: 4 },
  hint: { fontSize: 12, color: theme.slate500, marginBottom: 10, lineHeight: 17 },
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
  emptyBox: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 12,
  },
  emptyTxt: { fontSize: 14, color: theme.slate600, textAlign: 'center' },
  pigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    marginBottom: 8,
  },
  pigRowIn: { opacity: 0.92 },
  pigTxt: { flex: 1, minWidth: 0 },
  pigMat: { fontSize: 16, fontWeight: '800', color: theme.slate900 },
  pigNom: { fontSize: 14, color: theme.slate600, marginTop: 2 },
  secondaryBtn: {
    marginTop: 8,
    backgroundColor: theme.white,
    borderWidth: 2,
    borderColor: theme.teal600,
    paddingVertical: 14,
    borderRadius: theme.radiusMd,
    alignItems: 'center',
  },
  secondaryBtnTxt: { color: theme.teal700, fontWeight: '800', fontSize: 16 },
});
