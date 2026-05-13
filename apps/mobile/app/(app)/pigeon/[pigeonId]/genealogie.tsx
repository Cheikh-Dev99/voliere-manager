import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { getEnfants, obtenirPigeon } from '@shared/services/pigeonsService';
import type { Pigeon } from '@shared/types';

import { theme } from '../../../../constants/theme';

export default function PigeonGenealogieScreen() {
  const { pigeonId } = useLocalSearchParams<{ pigeonId: string }>();
  const [pigeon, setPigeon] = useState<Pigeon | null>(null);
  const [enfants, setEnfants] = useState<Pigeon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pigeonId) return;
      setLoading(true);
      try {
        const p = await obtenirPigeon(pigeonId);
        if (!alive) return;
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.teal700} />
      </View>
    );
  }

  if (error || !pigeon) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error ?? 'Introuvable'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={styles.lead}>Descendants de {pigeon.matricule}</Text>
      {enfants.length === 0 ? (
        <Text style={styles.muted}>Aucun enfant référencé en base.</Text>
      ) : (
        enfants.map((e) => (
          <View key={e.id} style={styles.card}>
            <Text style={styles.mat}>{e.matricule}</Text>
            <Text style={styles.nom}>{e.nom}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, backgroundColor: theme.slate50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: theme.red600 },
  lead: { fontSize: 16, fontWeight: '800', color: theme.slate900, marginBottom: 12 },
  muted: { color: theme.slate500 },
  card: {
    backgroundColor: theme.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  mat: { fontSize: 16, fontWeight: '800', color: theme.slate900 },
  nom: { fontSize: 14, color: theme.slate600, marginTop: 2 },
});
