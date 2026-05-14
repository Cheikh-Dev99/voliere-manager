import { Stack } from 'expo-router';

import { theme } from '../../../constants/theme';

export default function CoupleStackLayout() {
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
      <Stack.Screen name="nouveau" options={{ title: 'Nouveau couple' }} />
      <Stack.Screen name="[coupleId]" options={{ title: 'Fiche couple' }} />
    </Stack>
  );
}
