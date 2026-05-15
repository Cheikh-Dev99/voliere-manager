import { useMemo } from 'react';
import { Stack } from 'expo-router';

import { useAppTheme } from '../../../context/AppThemeContext';

export default function PigeonStackLayout() {
  const { colors } = useAppTheme();
  const screenOptions = useMemo(
    () => ({
      headerTintColor: colors.teal700,
      headerStyle: { backgroundColor: colors.surfaceElevated },
      headerShadowVisible: true,
      headerTitleStyle: { fontWeight: '600' as const, color: colors.slate900 },
      contentStyle: { backgroundColor: 'transparent' },
    }),
    [colors],
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="nouveau" options={{ title: 'Nouveau pigeon' }} />
      <Stack.Screen name="[pigeonId]/index" options={{ title: 'Fiche pigeon' }} />
      <Stack.Screen name="[pigeonId]/modifier" options={{ title: 'Modifier' }} />
      <Stack.Screen name="[pigeonId]/sante" options={{ title: 'Carnet de santé' }} />
      <Stack.Screen name="[pigeonId]/genealogie" options={{ title: 'Généalogie' }} />
    </Stack>
  );
}
