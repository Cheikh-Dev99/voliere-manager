import { Stack } from 'expo-router';

import { theme } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.slate100 },
        animation: 'none',
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
