import { useMemo } from 'react';
import { Stack } from 'expo-router';

import { useAppTheme } from '../../../context/AppThemeContext';
import { stackScreenOptions } from '../../../lib/navigationMotion';

export default function ReproductionStackLayout() {
  const { colors } = useAppTheme();
  const screenOptions = useMemo(() => stackScreenOptions(colors), [colors]);

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="nouveau" options={{ title: 'Nouvelle reproduction' }} />
      <Stack.Screen name="[reproductionId]" options={{ title: 'Fiche reproduction' }} />
    </Stack>
  );
}
