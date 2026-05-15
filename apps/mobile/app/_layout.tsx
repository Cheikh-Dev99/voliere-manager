import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { User } from 'firebase/auth';
import { ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { AppLoadingView } from '../components/ui/AppLoadingView';
import { AppFeedbackProvider } from '../components/providers/AppFeedbackProvider';
import { AppThemeProvider, useAppTheme } from '../context/AppThemeContext';
import { onAuthChange } from '@shared/firebase/auth';

function RootLayoutContent() {
  const { navigationTheme, colors, resolved } = useAppTheme();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  const navForRoot = useMemo(
    () => ({
      ...navigationTheme,
      colors: {
        ...navigationTheme.colors,
        background: 'transparent',
        card: 'transparent',
      },
    }),
    [navigationTheme],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        shell: {
          flex: 1,
          position: 'relative',
          backgroundColor: colors.slate100,
        },
        foreground: {
          flex: 1,
        },
        boot: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [colors.slate100],
  );

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
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
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
            <ThemeProvider value={navForRoot}>
              <Slot />
            </ThemeProvider>
          </View>
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AppFeedbackProvider>
          <RootLayoutContent />
        </AppFeedbackProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
