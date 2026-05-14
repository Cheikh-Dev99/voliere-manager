import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { obtenirCage } from '@shared/services/cagesService';
import type { Cage } from '@shared/types';

import { CageDetailView } from '../../../../components/cages/CageDetailView';
import { AppLoadingView } from '../../../../components/ui/AppLoadingView';
import { theme } from '../../../../constants/theme';

export default function CageDetailScreen() {
  const { cageId: cageIdParam } = useLocalSearchParams<{ cageId: string }>();
  const cageId = Array.isArray(cageIdParam) ? cageIdParam[0] : cageIdParam;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cage, setCage] = useState<Cage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!cageId) {
      setCage(null);
      setError('Identifiant de cage manquant.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const c = await obtenirCage(cageId);
      setCage(c);
      if (!c) setError('Cage introuvable.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [cageId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <AppLoadingView
          variant="embedded"
          loadingContext="cages"
          message="Chargement de la cage…"
          subtitle="Historique et détails."
        />
      </View>
    );
  }

  if (error || !cage) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Text style={styles.err}>{error ?? 'Introuvable'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.link}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <CageDetailView cage={cage} onReload={reload} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: theme.red600, marginBottom: 12, textAlign: 'center' },
  link: { color: theme.teal700, fontWeight: '800', fontSize: 16 },
  backBtn: { marginTop: 8, padding: 12 },
});
