import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

import { PigeonForm } from '../../../../components/forms/PigeonForm';

import { theme } from '../../../../constants/theme';

export default function ModifierPigeonScreen() {
  const { pigeonId } = useLocalSearchParams<{ pigeonId: string }>();
  if (!pigeonId) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Identifiant manquant.</Text>
      </View>
    );
  }
  return <PigeonForm isEdit pigeonId={pigeonId} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  err: { color: theme.red600, fontWeight: '600' },
});
