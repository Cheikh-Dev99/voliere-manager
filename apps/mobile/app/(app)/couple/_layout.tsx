import { useMemo } from 'react';
import { Stack } from 'expo-router';

import { useAppTheme } from '../../../context/AppThemeContext';
import { stackScreenOptions } from '../../../lib/navigationMotion';

export default function CoupleStackLayout() {
  const { colors } = useAppTheme();
  const screenOptions = useMemo(() => stackScreenOptions(colors), [colors]);

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="nouveau" options={{ title: 'Nouveau couple' }} />
      <Stack.Screen name="[coupleId]" options={{ title: 'Fiche couple' }} />
    </Stack>
  );
}
