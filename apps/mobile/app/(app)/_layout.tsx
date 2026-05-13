import { Stack } from 'expo-router';

import { MergedVoliereCodesProvider } from '../../contexts/MergedVoliereCodesContext';
import { theme } from '../../constants/theme';

export default function AppStackLayout() {
  return (
    <MergedVoliereCodesProvider>
      <Stack
        screenOptions={{
          headerTintColor: theme.teal700,
          headerStyle: { backgroundColor: theme.white },
          headerShadowVisible: true,
          headerTitleStyle: { color: theme.slate900, fontWeight: '600' },
          contentStyle: { backgroundColor: theme.slate50 },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pigeon" options={{ headerShown: false }} />
        <Stack.Screen name="cage" options={{ headerShown: false }} />
        <Stack.Screen name="couple" options={{ headerShown: false }} />
        <Stack.Screen name="reproduction" options={{ headerShown: false }} />
      </Stack>
    </MergedVoliereCodesProvider>
  );
}
