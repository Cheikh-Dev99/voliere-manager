import { useMemo } from 'react';
import { Stack } from 'expo-router';

import { useAppTheme } from '../../../context/AppThemeContext';
import { stackScreenOptions } from '../../../lib/navigationMotion';

export default function PigeonStackLayout() {
  const { colors } = useAppTheme();
  const screenOptions = useMemo(() => stackScreenOptions(colors), [colors]);

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
