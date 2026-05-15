import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MergedVoliereCodesProvider } from '../../contexts/MergedVoliereCodesContext';
import { useAppTheme } from '../../context/AppThemeContext';
import { stackScreenOptions } from '../../lib/navigationMotion';

export default function AppStackLayout() {
  const { colors } = useAppTheme();

  const screenOptions = useMemo(
    () => ({
      ...stackScreenOptions(colors),
      contentStyle: { backgroundColor: colors.slate100 },
    }),
    [colors],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        stackRoot: {
          flex: 1,
          backgroundColor: colors.slate100,
          position: 'relative',
        },
      }),
    [colors.slate100],
  );

  return (
    <MergedVoliereCodesProvider>
      <View style={styles.stackRoot}>
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="pigeon" options={{ headerShown: false }} />
          <Stack.Screen name="cage" options={{ headerShown: false }} />
          <Stack.Screen name="couple" options={{ headerShown: false }} />
          <Stack.Screen name="reproduction" options={{ headerShown: false }} />
          <Stack.Screen name="sortie" options={{ headerShown: false }} />
        </Stack>
      </View>
    </MergedVoliereCodesProvider>
  );
}
