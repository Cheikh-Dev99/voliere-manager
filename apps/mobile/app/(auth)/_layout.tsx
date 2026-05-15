import { useMemo } from 'react';
import { Stack } from 'expo-router';

import { useAppTheme } from '../../context/AppThemeContext';

export default function AuthLayout() {
  const { colors } = useAppTheme();

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      contentStyle: { backgroundColor: colors.slate100 },
      animation: 'none' as const,
    }),
    [colors.slate100],
  );

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
