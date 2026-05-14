import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { obtenirPigeon } from '@shared/services/pigeonsService';
import type { Pigeon } from '@shared/types';

import { PigeonPhotoAvatar } from '../../../../components/pigeons/PigeonPhotoAvatar';
import { AppLoadingView } from '../../../../components/ui/AppLoadingView';
import { theme } from '../../../../constants/theme';
import { formatFirestoreDate } from '../../../../utils/formatDate';

const STATUT_LABEL: Record<string, string> = {
  ACTIF: 'Actif',
  VENDU: 'Vendu',
  MORT: 'Mort',
  PERDU: 'Perdu',
};

export default function PigeonDetailScreen() {
  const { pigeonId } = useLocalSearchParams<{ pigeonId: string }>();
  const router = useRouter();
  const [pigeon, setPigeon] = useState<Pigeon | null>(null);
  const [pere, setPere] = useState<Pigeon | null>(null);
  const [mere, setMere] = useState<Pigeon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pigeonId) return;
      setLoading(true);
      setError(null);
      try {
        const p = await obtenirPigeon(pigeonId);
        if (!alive) return;
        if (!p) {
          setPigeon(null);
          setError('Pigeon introuvable.');
          return;
        }
        setPigeon(p);
        const [pr, mr] = await Promise.all([
          p.pereId ? obtenirPigeon(p.pereId) : Promise.resolve(null),
          p.mereId ? obtenirPigeon(p.mereId) : Promise.resolve(null),
        ]);
        if (!alive) return;
        setPere(pr);
        setMere(mr);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pigeonId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="default"
          message="Chargement du pigeon…"
          subtitle="Fiche, parents et statut."
        />
      </View>
    );
  }

  if (error || !pigeon) {
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
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.photoWrap}>
        <PigeonPhotoAvatar pigeon={pigeon} size="lg" circle />
      </View>
      <Text style={styles.mat}>{pigeon.matricule}</Text>
      <Text style={styles.nom}>{pigeon.nom}</Text>
      <View style={styles.pillRow}>
        <Text style={styles.pill}>{STATUT_LABEL[pigeon.statut] ?? pigeon.statut}</Text>
        <Text style={styles.pillOutline}>{pigeon.sexe}</Text>
      </View>

      <View style={styles.block}>
        <Row label="Race" value={pigeon.race} />
        <Row label="Naissance" value={formatFirestoreDate(pigeon.dateNaissance, 'long')} />
        <Row label="Couleur" value={pigeon.couleur} />
        <Row label="Père" value={pere ? `${pere.matricule} — ${pere.nom}` : '—'} />
        <Row label="Mère" value={mere ? `${mere.matricule} — ${mere.nom}` : '—'} />
      </View>

      {pigeon.notes ? (
        <View style={styles.block}>
          <Text style={styles.section}>Notes</Text>
          <Text style={styles.notes}>{pigeon.notes}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={styles.actionBtnSecondary}
          onPress={() => router.push(`/(app)/pigeon/${pigeon.id}/modifier`)}
        >
          <Text style={styles.actionTxtSecondary}>Modifier</Text>
        </Pressable>
      </View>

      {pigeon.statut === 'ACTIF' ? (
        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtnSecondary}
            onPress={() => router.push({ pathname: '/sortie/nouveau', params: { pigeon: pigeon.id } })}
          >
            <Text style={styles.actionTxtSecondary}>Sortie (vente, décès…)</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push(`/(app)/pigeon/${pigeon.id}/sante`)}
        >
          <Text style={styles.actionTxt}>Santé</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => router.push(`/(app)/pigeon/${pigeon.id}/genealogie`)}
        >
          <Text style={styles.actionTxt}>Généalogie</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLab}>{label}</Text>
      <Text style={styles.rowVal}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 16, paddingBottom: 40 },
  photoWrap: { alignItems: 'center', marginBottom: 16 },
  err: { color: theme.red600, marginBottom: 12, textAlign: 'center' },
  backBtn: { padding: 12 },
  backTxt: { color: theme.teal700, fontWeight: '700', fontSize: 15 },
  mat: { fontSize: 26, fontWeight: '900', color: theme.slate900 },
  nom: { fontSize: 18, color: theme.slate700, marginTop: 4 },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: { backgroundColor: theme.emerald50, color: theme.emerald900, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  pillOutline: { borderWidth: 1, borderColor: theme.border, color: theme.slate700, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  block: { marginTop: 20, backgroundColor: theme.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border },
  section: { fontSize: 14, fontWeight: '800', color: theme.slate800, marginBottom: 8 },
  notes: { fontSize: 15, color: theme.slate600, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.slate200 },
  rowLab: { fontSize: 14, color: theme.slate500, fontWeight: '600', flex: 1 },
  rowVal: { fontSize: 14, color: theme.slate900, fontWeight: '600', flex: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, backgroundColor: theme.teal600, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionTxt: { color: theme.white, fontWeight: '800', fontSize: 15 },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: theme.white,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.teal600,
  },
  actionTxtSecondary: { color: theme.teal700, fontWeight: '800', fontSize: 15 },
});
