import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCages } from '@shared/hooks/useCages';
import { usePigeons } from '@shared/hooks/usePigeons';
import { obtenirSortie } from '@shared/services/sortiesService';
import type { Sortie, SortieType } from '@shared/types';

import { PigeonPhotoAvatar } from '../../../components/pigeons/PigeonPhotoAvatar';
import { AppLoadingView } from '../../../components/ui/AppLoadingView';
import { theme, shadowCard } from '../../../constants/theme';
import { formatFirestoreDate } from '../../../utils/formatDate';

const TYPE_LABEL: Record<SortieType, string> = {
  VENTE: 'Vente',
  DECES: 'Décès',
  PERTE: 'Perte',
};

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

export default function SortieDetailScreen() {
  const router = useRouter();
  const { sortieId: sortieIdParam } = useLocalSearchParams<{ sortieId: string | string[] }>();
  const sortieId = useMemo(() => normalizeId(sortieIdParam), [sortieIdParam]);

  const { pigeons } = usePigeons(true);
  const { cages } = useCages();

  const [sortie, setSortie] = useState<Sortie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pigeonById = useMemo(() => {
    const m = new Map<string, (typeof pigeons)[number]>();
    pigeons.forEach((p) => m.set(p.id, p));
    return m;
  }, [pigeons]);

  const cageById = useMemo(() => {
    const m = new Map<string, (typeof cages)[number]>();
    cages.forEach((c) => m.set(c.id, c));
    return m;
  }, [cages]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!sortieId) {
        setSortie(null);
        setError('Identifiant manquant.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const s = await obtenirSortie(sortieId);
        if (!alive) return;
        if (!s) {
          setSortie(null);
          setError('Sortie introuvable.');
          return;
        }
        setSortie(s);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sortieId]);

  const pigeon = sortie ? pigeonById.get(sortie.pigeonId) : undefined;
  const pigeonPhotoRef = sortie ? (pigeon ?? { id: sortie.pigeonId, photo: null }) : null;
  const conjoint = sortie?.conjointPigeonId ? pigeonById.get(sortie.conjointPigeonId) : undefined;
  const cageSolo = sortie?.cageSoloIdLiberee ? cageById.get(sortie.cageSoloIdLiberee) : undefined;
  const cageCouple = sortie?.cageCoupleIdLiberee ? cageById.get(sortie.cageCoupleIdLiberee) : undefined;

  const cageLabel = (c: { voliereCode?: string | null; numero: string; nom?: string | null } | undefined) =>
    c ? `${c.voliereCode ?? 'A'} · ${c.numero}${c.nom ? ` — ${c.nom}` : ''}` : '—';

  if (loading) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="sorties"
          message="Chargement de la sortie…"
          subtitle="Détails et pigeon."
        />
      </View>
    );
  }

  if (error || !sortie) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error ?? 'Introuvable'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backTxt}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={[styles.headCard, shadowCard]}>
        <View style={styles.headRow}>
          <PigeonPhotoAvatar pigeon={pigeonPhotoRef} size="lg" circle />
          <View style={styles.headText}>
            <View style={styles.rowTop}>
              <Text style={[styles.typeBadge, typeBadgeStyle(sortie.type)]}>{TYPE_LABEL[sortie.type]}</Text>
              <Text style={styles.dateHead}>{formatFirestoreDate(sortie.date, 'long')}</Text>
            </View>
            <Text style={styles.mat}>{sortie.pigeonMatricule ?? pigeon?.matricule ?? '—'}</Text>
            {pigeon?.nom ? <Text style={styles.nomP}>{pigeon.nom}</Text> : null}
          </View>
        </View>
      </View>

      <View style={[styles.block, shadowCard]}>
        <Text style={styles.section}>Détail</Text>
        {sortie.type === 'VENTE' ? (
          <>
            <Row label="Prix" value={sortie.prix != null ? String(sortie.prix) : '—'} />
            <Row label="Acheteur" value={sortie.acheteur ?? ''} />
          </>
        ) : null}
        {sortie.type === 'DECES' ? <Row label="Cause" value={sortie.cause ?? ''} /> : null}
        {sortie.type === 'PERTE' ? <Row label="Circonstance" value={sortie.circonstance ?? ''} /> : null}
        <Row label="Notes" value={sortie.notes ?? ''} />
        <Row label="Enregistré le" value={formatFirestoreDate(sortie.createdAt, 'long')} />
      </View>

      {(sortie.cageSoloIdLiberee || sortie.cageCoupleIdLiberee || sortie.coupleRompuId) && (
        <View style={[styles.block, shadowCard]}>
          <Text style={styles.section}>Effets enregistrés</Text>
          {sortie.cageSoloIdLiberee ? (
            <Row
              label="Cage (pigeon seul) libérée"
              value={cageSolo ? cageLabel(cageSolo) : sortie.cageSoloIdLiberee}
            />
          ) : null}
          {sortie.cageCoupleIdLiberee ? (
            <Row
              label="Cage (couple) libérée"
              value={cageCouple ? cageLabel(cageCouple) : sortie.cageCoupleIdLiberee}
            />
          ) : null}
          {sortie.coupleRompuId ? (
            <Row
              label="Couple rompu"
              value={
                conjoint
                  ? `${conjoint.matricule} — ${conjoint.nom} (conjoint)`
                  : sortie.conjointPigeonId
                    ? `Conjoint id : ${sortie.conjointPigeonId.slice(0, 8)}…`
                    : 'Oui'
              }
            />
          ) : null}
        </View>
      )}

      <Pressable
        style={styles.primaryBtn}
        onPress={() => router.push({ pathname: '/pigeon/[pigeonId]', params: { pigeonId: sortie.pigeonId } })}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir la fiche pigeon"
      >
        <Text style={styles.primaryBtnTxt}>Ouvrir la fiche pigeon</Text>
      </Pressable>
    </ScrollView>
  );
}

function typeBadgeStyle(t: SortieType) {
  switch (t) {
    case 'VENTE':
      return { backgroundColor: theme.teal100, color: theme.teal900 };
    case 'DECES':
      return { backgroundColor: theme.slate200, color: theme.slate900 };
    case 'PERTE':
      return { backgroundColor: theme.amber50, color: theme.amber950 };
    default:
      return { backgroundColor: theme.teal100, color: theme.teal900 };
  }
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
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  headText: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  typeBadge: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dateHead: { fontSize: 13, color: theme.slate600, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  mat: { fontSize: 22, fontWeight: '900', color: theme.slate900 },
  nomP: { fontSize: 15, color: theme.slate600, marginTop: 4 },
  block: {
    backgroundColor: theme.white,
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
  rowLab: { fontSize: 13, color: theme.slate500, fontWeight: '600', flex: 0.4 },
  rowVal: { fontSize: 14, color: theme.slate900, fontWeight: '600', flex: 0.6, textAlign: 'right' },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: theme.teal600,
    borderRadius: theme.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: theme.white, fontWeight: '800', fontSize: 16 },
});
