import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { obtenirCage } from '@shared/services/cagesService';
import type { Cage } from '@shared/types';

import { CageDetailView } from '../../../../components/cages/CageDetailView';
import { TabScreenFade } from '../../../../components/layout/TabScreenFade';
import { AppLoadingView } from '../../../../components/ui/AppLoadingView';
import { theme } from '../../../../constants/theme';

type LoadSignal = { cancelled: boolean };

export default function CageDetailScreen() {
  const { cageId: cageIdParam } = useLocalSearchParams<{ cageId: string }>();
  const cageId = Array.isArray(cageIdParam) ? cageIdParam[0] : cageIdParam;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [cage, setCage] = useState<Cage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCage = useCallback(
    async (signal?: LoadSignal) => {
      const cancelled = () => signal?.cancelled === true;
      if (!cageId) {
        if (!cancelled()) {
          setCage(null);
          setError('Identifiant de cage manquant.');
          setLoading(false);
        }
        return;
      }
      if (!cancelled()) {
        setLoading(true);
        setError(null);
      }
      try {
        const c = await obtenirCage(cageId);
        if (cancelled()) return;
        setCage(c);
        if (!c) setError('Cage introuvable.');
      } catch (e) {
        if (!cancelled()) setError(e instanceof Error ? e.message : 'Erreur');
      } finally {
        if (!cancelled()) setLoading(false);
      }
    },
    [cageId],
  );

  const reload = useCallback(() => loadCage(), [loadCage]);

  useEffect(() => {
    const signal: LoadSignal = { cancelled: false };
    void loadCage(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadCage]);

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
    <TabScreenFade>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <CageDetailView cage={cage} onReload={reload} />
      </View>
    </TabScreenFade>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: theme.red600, marginBottom: 12, textAlign: 'center' },
  link: { color: theme.teal700, fontWeight: '800', fontSize: 16 },
  backBtn: { marginTop: 8, padding: 12 },
});
