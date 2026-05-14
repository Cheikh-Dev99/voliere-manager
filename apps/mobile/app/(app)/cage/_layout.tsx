import { Stack } from 'expo-router';

import { theme } from '../../../constants/theme';

export default function CageStackLayout() {
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
      <Stack.Screen name="nouveau" options={{ title: 'Nouvelle cage' }} />
      <Stack.Screen name="edit/[cageId]" options={{ title: 'Modifier la cage' }} />
      <Stack.Screen name="[cageId]/index" options={{ headerShown: false, title: 'Cage' }} />
      <Stack.Screen name="[cageId]/historique" options={{ headerShown: false, title: 'Historique' }} />
    </Stack>
  );
}
