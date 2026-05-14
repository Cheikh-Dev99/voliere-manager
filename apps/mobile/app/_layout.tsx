import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { User } from 'firebase/auth';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';

import { AppLoadingView } from '../components/ui/AppLoadingView';
import { AppFeedbackProvider } from '../components/providers/AppFeedbackProvider';
import { theme } from '../constants/theme';
import { onAuthChange } from '@shared/firebase/auth';

/** Fond transparent : chaque groupe de routes applique son propre fond (ex. filigrane uniquement sur les onglets principaux). */
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

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
      router.replace('/(app)/(tabs)/cages');
    }
  }, [user, segments, router]);

  return (
    <SafeAreaProvider>
      <AppFeedbackProvider>
        {user === undefined ? (
          <View style={styles.shell}>
            <View style={styles.boot}>
              <AppLoadingView
                variant="fullscreen"
                loadingContext="default"
                message="Chargement…"
                subtitle="Volière Manager"
              />
            </View>
          </View>
        ) : (
          <View style={styles.shell}>
            <View style={styles.foreground}>
              <ThemeProvider value={navigationTheme}>
                <Slot />
              </ThemeProvider>
            </View>
          </View>
        )}
      </AppFeedbackProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    position: 'relative',
    backgroundColor: theme.slate100,
  },
  foreground: {
    flex: 1,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
