import { Stack } from 'expo-router';

import { theme } from '../../../constants/theme';

export default function SortieStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.teal700,
        headerStyle: { backgroundColor: theme.white },
        headerShadowVisible: true,
        headerTitleStyle: { color: theme.slate900, fontWeight: '700' },
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="nouveau" options={{ title: 'Nouvelle sortie' }} />
      <Stack.Screen name="[sortieId]" options={{ title: 'Fiche sortie' }} />
    </Stack>
  );
}
