import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme, type Theme as NavTheme } from '@react-navigation/native';

import { darkPalette, lightPalette, shadowCardFor, type ThemeColors } from '../constants/palettes';

const STORAGE_KEY = 'voliere-manager:theme-preference';

export type ThemePreference = 'light' | 'dark' | 'system';

type AppThemeValue = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  resolved: 'light' | 'dark';
  colors: ThemeColors;
  shadowCard: ReturnType<typeof shadowCardFor>;
  navigationTheme: NavTheme;
};

const AppThemeContext = createContext<AppThemeValue | null>(null);

function readInitialPreference(): ThemePreference {
  return 'light';
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(readInitialPreference);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      if (raw === 'light' || raw === 'dark' || raw === 'system') {
        setPreferenceState(raw);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const resolved: 'light' | 'dark' = useMemo(() => {
    if (preference === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return preference;
  }, [preference, systemScheme]);

  const colors = useMemo(
    () => (resolved === 'dark' ? darkPalette : lightPalette),
    [resolved],
  );

  const shadowCard = useMemo(() => shadowCardFor(colors, resolved), [colors, resolved]);

  const navigationTheme = useMemo((): NavTheme => {
    const base = resolved === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.teal700,
        background: 'transparent',
        card: colors.surfaceElevated,
        text: colors.slate900,
        border: colors.border,
        notification: colors.teal600,
      },
    };
  }, [resolved, colors]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      resolved,
      colors,
      shadowCard,
      navigationTheme,
    }),
    [preference, setPreference, resolved, colors, shadowCard, navigationTheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme doit être utilisé sous AppThemeProvider');
  }
  return ctx;
}

/** Palette résolue (clair/sombre) pour styles dynamiques. */
export function useThemeColors(): ThemeColors {
  return useAppTheme().colors;
}

export function useShadowCardStyle() {
  return useAppTheme().shadowCard;
}
