import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { User } from 'firebase/auth';

import { onAuthChange } from '@shared/firebase/auth';

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    return onAuthChange(setUser);
  }, []);

  useEffect(() => {
    if (user === undefined) return;

    const root = segments[0];
    const inAuth = root === '(auth)';

    if (user === null) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (inAuth) {
      router.replace('/(app)/(tabs)');
    }
  }, [user, segments, router]);

  return (
    <SafeAreaProvider>
      {user === undefined ? (
        <View style={styles.boot}>
          <ActivityIndicator size="large" color="#0f766e" accessibilityLabel="Chargement" />
        </View>
      ) : (
        <Slot />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
