import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { usePigeonHealthHistory } from '@shared/hooks/usePigeonHealthHistory';
import { formatFirestoreDate } from '../../../../utils/formatDate';
import { theme } from '../../../../constants/theme';

export default function PigeonSanteScreen() {
  const { pigeonId } = useLocalSearchParams<{ pigeonId: string }>();
  const pigeonIds = useMemo(() => (pigeonId ? [pigeonId] : []), [pigeonId]);
  const { mergedSorted, loading, error } = usePigeonHealthHistory(pigeonIds);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.teal700} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={mergedSorted}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      ListEmptyComponent={<Text style={styles.muted}>Aucun événement de santé enregistré.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.date}>{formatFirestoreDate(item.occurredAt)}</Text>
          <Text style={styles.sum}>{item.summary}</Text>
          {item.detail ? <Text style={styles.det}>{item.detail}</Text> : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: theme.red600, padding: 16 },
  muted: { textAlign: 'center', color: theme.slate500, marginTop: 24 },
  card: {
    backgroundColor: theme.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  date: { fontSize: 12, fontWeight: '700', color: theme.teal800 },
  sum: { fontSize: 16, fontWeight: '800', color: theme.slate900, marginTop: 4 },
  det: { fontSize: 14, color: theme.slate600, marginTop: 6, lineHeight: 20 },
});
