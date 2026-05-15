import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { usePigeons } from '@shared/hooks/usePigeons';
import { getEnfants, obtenirPigeon } from '@shared/services/pigeonsService';
import type { Pigeon } from '@shared/types';

import { PigeonSoloAncestorBlock } from '../../../../components/genealogy/GenealogyForRootView';
import { PigeonPhotoAvatar } from '../../../../components/pigeons/PigeonPhotoAvatar';
import { AppLoadingView } from '../../../../components/ui/AppLoadingView';
import type { ThemeColors } from '../../../../constants/palettes';
import { useThemedStyles } from '../../../../lib/useThemedStyles';

export default function PigeonGenealogieScreen() {
  const styles = useThemedStyles(createStyles);
  const { pigeonId: pigeonIdParam } = useLocalSearchParams<{ pigeonId: string }>();
  const pigeonId = Array.isArray(pigeonIdParam) ? pigeonIdParam[0] : pigeonIdParam;
  const router = useRouter();
  const { pigeons, loading: lp } = usePigeons(true);

  const [pigeon, setPigeon] = useState<Pigeon | null>(null);
  const [enfants, setEnfants] = useState<Pigeon[]>([]);
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
        const kids = await getEnfants(pigeonId);
        if (!alive) return;
        setEnfants(kids);
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

  const pigeonById = useMemo(() => {
    const m = new Map<string, Pigeon>();
    pigeons.forEach((x) => m.set(x.id, x));
    if (pigeon) m.set(pigeon.id, pigeon);
    return m;
  }, [pigeons, pigeon]);

  const openPigeon = (id: string) => {
    router.push(`/(app)/pigeon/${id}`);
  };

  if (loading || lp) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="default"
          message="Chargement de la généalogie…"
          subtitle="Arbre et descendants."
        />
      </View>
    );
  }

  if (error || !pigeon) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error ?? 'Introuvable'}</Text>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backTxt}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.heroRow}>
        <PigeonPhotoAvatar pigeon={pigeon} size="lg" circle />
        <View style={styles.heroText}>
          <Text style={styles.title}>Généalogie — {pigeon.matricule}</Text>
          <Text style={styles.sub}>{pigeon.nom}</Text>
        </View>
      </View>

      <PigeonSoloAncestorBlock pigeon={pigeon} pigeonById={pigeonById} onOpenPigeon={openPigeon} />

      <View style={styles.sep} />

      <Text style={styles.section}>Descendants</Text>
      <Text style={styles.descHint}>Jeunes dont ce pigeon est référencé comme père ou mère dans la base.</Text>
      {enfants.length === 0 ? (
        <Text style={styles.muted}>Aucun enfant référencé.</Text>
      ) : (
        enfants.map((e) => (
          <Pressable key={e.id} style={styles.card} onPress={() => openPigeon(e.id)}>
            <View style={styles.childRow}>
              <PigeonPhotoAvatar pigeon={e} size="sm" />
              <View style={styles.childText}>
                <Text style={styles.mat}>{e.matricule}</Text>
                <Text style={styles.nom}>{e.nom}</Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    scroll: { padding: 16, paddingBottom: 40, backgroundColor: 'transparent' },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
    heroText: { flex: 1, minWidth: 0 },
    childRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    childText: { flex: 1, minWidth: 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'transparent' },
    err: { color: theme.red600, textAlign: 'center', marginBottom: 12 },
    back: { padding: 12 },
    backTxt: { color: theme.teal700, fontWeight: '800' },
    title: { fontSize: 20, fontWeight: '900', color: theme.slate900 },
    sub: { fontSize: 15, color: theme.slate600, marginTop: 4, marginBottom: 8 },
    sep: { height: 1, backgroundColor: theme.slate200, marginVertical: 20 },
    section: { fontSize: 15, fontWeight: '800', color: theme.slate800, marginBottom: 6 },
    descHint: { fontSize: 12, color: theme.slate500, marginBottom: 12, lineHeight: 17 },
    muted: { fontSize: 14, color: theme.slate500 },
    card: {
      backgroundColor: theme.surfaceElevated,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    mat: { fontSize: 16, fontWeight: '800', color: theme.slate900 },
    nom: { fontSize: 14, color: theme.slate600, marginTop: 2 },
  });
}
