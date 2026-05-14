import { Stack } from 'expo-router';

import { theme } from '../../../constants/theme';

export default function PigeonStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.teal700,
        headerStyle: { backgroundColor: theme.white },
        headerShadowVisible: true,
        headerTitleStyle: { fontWeight: '600', color: theme.slate900 },
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="nouveau" options={{ title: 'Nouveau pigeon' }} />
      <Stack.Screen name="[pigeonId]/index" options={{ title: 'Fiche pigeon' }} />
      <Stack.Screen name="[pigeonId]/modifier" options={{ title: 'Modifier' }} />
      <Stack.Screen name="[pigeonId]/sante" options={{ title: 'Carnet de santé' }} />
      <Stack.Screen name="[pigeonId]/genealogie" options={{ title: 'Généalogie' }} />
    </Stack>
  );
}
