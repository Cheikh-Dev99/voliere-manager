import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MergedVoliereCodesProvider } from '../../contexts/MergedVoliereCodesContext';
import { theme } from '../../constants/theme';

export default function AppStackLayout() {
  return (
    <MergedVoliereCodesProvider>
      <View style={styles.stackRoot}>
        <Stack
          screenOptions={{
            headerTintColor: theme.teal700,
            headerStyle: { backgroundColor: theme.white },
            headerShadowVisible: true,
            headerTitleStyle: { color: theme.slate900, fontWeight: '600' },
            contentStyle: { backgroundColor: theme.slate100 },
          }}
        >
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

const styles = StyleSheet.create({
  stackRoot: {
    flex: 1,
    backgroundColor: theme.slate100,
    position: 'relative',
  },
});
