import { useMemo } from 'react';
import { Stack } from 'expo-router';

import { useAppTheme } from '../../../context/AppThemeContext';

export default function CageStackLayout() {
  const { colors } = useAppTheme();
  const screenOptions = useMemo(
    () => ({
      headerTintColor: colors.teal700,
      headerStyle: { backgroundColor: colors.surfaceElevated },
      headerShadowVisible: true,
      headerTitleStyle: { color: colors.slate900, fontWeight: '700' as const },
      contentStyle: { backgroundColor: 'transparent' },
    }),
    [colors],
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="nouveau" options={{ title: 'Nouvelle cage' }} />
      <Stack.Screen name="edit/[cageId]" options={{ title: 'Modifier la cage' }} />
      <Stack.Screen name="[cageId]/index" options={{ headerShown: false, title: 'Cage' }} />
      <Stack.Screen name="[cageId]/historique" options={{ headerShown: false, title: 'Historique' }} />
    </Stack>
  );
}
