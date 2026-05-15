import { Platform } from 'react-native';

import type { ThemeColors } from '../constants/palettes';

/** Options Stack partagées — transition + en-tête cohérents. */
export function stackScreenOptions(colors: ThemeColors) {
  const isWeb = Platform.OS === 'web';

  return {
    headerTintColor: colors.teal700,
    headerStyle: { backgroundColor: colors.surfaceElevated },
    headerShadowVisible: true,
    headerTitleStyle: { color: colors.slate900, fontWeight: '700' as const },
    contentStyle: { backgroundColor: 'transparent' as const },
    animation: (isWeb ? 'fade' : 'slide_from_right') as 'fade' | 'slide_from_right',
    animationDuration: isWeb ? 360 : 400,
    gestureEnabled: !isWeb,
    fullScreenGestureEnabled: !isWeb,
  };
}
