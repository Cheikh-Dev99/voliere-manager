import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { User } from 'firebase/auth';
import { ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { LaunchSplashView } from '../components/ui/LaunchSplashView';
import { AppFeedbackProvider } from '../components/providers/AppFeedbackProvider';
import { AppThemeProvider, useAppTheme } from '../context/AppThemeContext';
import { onAuthChange } from '@shared/firebase/auth';

/** Durée minimale d’affichage du splash avant d’ouvrir le login (utilisateur non connecté). */
const LAUNCH_SPLASH_MIN_MS = 1600;

function RootLayoutContent() {
  const { navigationTheme, colors, resolved } = useAppTheme();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [splashMinDone, setSplashMinDone] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setSplashMinDone(true), LAUNCH_SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

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
        shellSplash: {
          backgroundColor: '#ffffff',
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
      if (!splashMinDone) return;
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }

    if (inAuth) {
      router.replace('/(app)/(tabs)');
    }
  }, [user, segments, router, splashMinDone]);

  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {user === undefined || (user === null && !splashMinDone) ? (
        <View style={[styles.shell, styles.shellSplash]}>
          <LaunchSplashView />
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
