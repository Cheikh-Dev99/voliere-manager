import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';

import type { ShadowCardStyle, ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { getLoadingGifSource, type LoadingGifContext } from '../../lib/loadingGifAssets';

export type { LoadingGifContext };
export type AppLoadingVariant = 'fullscreen' | 'embedded' | 'compact' | 'inline';

export type AppLoadingViewProps = {
  variant?: AppLoadingVariant;
  message?: string;
  subtitle?: string;
  loadingContext?: LoadingGifContext;
  style?: ViewStyle;
};

function createAppLoadingStyles(theme: ThemeColors, shadowCard: ShadowCardStyle) {
  return StyleSheet.create({
    gifWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    embeddedCard: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 420,
      borderRadius: theme.radiusLg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: 'center',
      ...shadowCard,
    },
    embedMsg: {
      marginTop: 16,
      fontSize: 15,
      fontWeight: '700',
      color: theme.slate900,
      textAlign: 'center',
    },
    embedSub: {
      marginTop: 8,
      fontSize: 13,
      lineHeight: 19,
      color: theme.slate600,
      textAlign: 'center',
    },
    compactRoot: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 12,
    },
    compactMsg: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: '600',
      color: theme.slate700,
      textAlign: 'center',
    },
    compactSub: {
      marginTop: 6,
      fontSize: 12,
      color: theme.slate500,
      textAlign: 'center',
      maxWidth: 280,
      lineHeight: 17,
    },
    inlineRoot: {
      marginTop: 8,
      alignItems: 'center',
      gap: 6,
    },
    inlineMsg: {
      fontSize: 11,
      color: theme.slate500,
      textAlign: 'center',
    },
    fullRoot: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    fullMsg: {
      marginTop: 20,
      fontSize: 17,
      fontWeight: '800',
      color: theme.slate900,
      textAlign: 'center',
    },
    fullSub: {
      marginTop: 8,
      fontSize: 14,
      color: theme.slate600,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}

/** Aligné sur le web `vm-loading-dot` (1.1s, décalages 0 / 0.15s / 0.3s). */
function LoadingDot({ delay, size }: { delay: number; size: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: 440,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 660,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [v, delay]);
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(13, 148, 136, 0.88)',
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

function LoadingDotsRow({
  styles,
  dotSize,
  marginTop = 6,
}: {
  styles: ReturnType<typeof createAppLoadingStyles>;
  dotSize: number;
  marginTop?: number;
}) {
  return (
    <View
      style={[styles.dotsRow, { marginTop }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LoadingDot delay={0} size={dotSize} />
      <LoadingDot delay={150} size={dotSize} />
      <LoadingDot delay={300} size={dotSize} />
    </View>
  );
}

/** Aligné sur le web `vm-pigeon-float` (~3s). */
function LoadingGifGraphic({
  gifWrapStyle,
  context,
  maxHeight,
}: {
  gifWrapStyle: ViewStyle;
  context: LoadingGifContext;
  maxHeight: number;
}) {
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float]);
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate = float.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1.5deg'] });
  const src = getLoadingGifSource(context);
  const w = Math.round(maxHeight * 1.35);
  /** Même idée que le web `filter: url(#vm-loading-gif-knockout)` : le blanc du GIF se fond avec le fond. */
  const gifImageStyle = useMemo(
    () =>
      ({
        height: maxHeight,
        width: w,
        resizeMode: 'contain',
        backgroundColor: 'transparent',
        /* iOS / Android récents : fusion avec le fond (équivalent web filtre knockout) */
        blendMode: 'multiply',
      }) as ImageStyle,
    [maxHeight, w],
  );

  return (
    <Animated.View
      style={[gifWrapStyle, { transform: [{ translateY }, { rotate }] }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={src}
        style={gifImageStyle}
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}

export function AppLoadingView({
  variant = 'embedded',
  message = 'Chargement…',
  subtitle,
  loadingContext = 'default',
  style,
}: AppLoadingViewProps) {
  const { colors: theme, shadowCard } = useAppTheme();
  const styles = useMemo(() => createAppLoadingStyles(theme, shadowCard), [theme, shadowCard]);
  const ctx: LoadingGifContext = loadingContext ?? 'default';

  if (variant === 'inline') {
    return (
      <View
        style={[styles.inlineRoot, style]}
        accessibilityRole="progressbar"
        accessibilityLiveRegion="polite"
        accessibilityLabel={message || 'Chargement'}
      >
        <LoadingGifGraphic gifWrapStyle={styles.gifWrap} context={ctx} maxHeight={56} />
        {message ? <Text style={styles.inlineMsg}>{message}</Text> : null}
        <LoadingDotsRow styles={styles} dotSize={7} marginTop={6} />
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View
        style={[styles.compactRoot, style]}
        accessibilityRole="progressbar"
        accessibilityLiveRegion="polite"
        accessibilityLabel={message}
      >
        <LoadingGifGraphic gifWrapStyle={styles.gifWrap} context={ctx} maxHeight={72} />
        <Text style={styles.compactMsg}>{message}</Text>
        {subtitle ? <Text style={styles.compactSub}>{subtitle}</Text> : null}
        <LoadingDotsRow styles={styles} dotSize={8} marginTop={12} />
      </View>
    );
  }

  if (variant === 'fullscreen') {
    return (
      <View
        style={[styles.fullRoot, style]}
        accessibilityRole="progressbar"
        accessibilityLiveRegion="polite"
        accessibilityLabel={message}
      >
        <LoadingGifGraphic gifWrapStyle={styles.gifWrap} context={ctx} maxHeight={100} />
        <Text style={styles.fullMsg}>{message}</Text>
        {subtitle ? <Text style={styles.fullSub}>{subtitle}</Text> : null}
        <LoadingDotsRow styles={styles} dotSize={10} marginTop={20} />
      </View>
    );
  }

  return (
    <View
      style={[styles.embeddedCard, style]}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <LoadingGifGraphic gifWrapStyle={styles.gifWrap} context={ctx} maxHeight={88} />
      <Text style={styles.embedMsg}>{message}</Text>
      {subtitle ? <Text style={styles.embedSub}>{subtitle}</Text> : null}
      <LoadingDotsRow styles={styles} dotSize={8} marginTop={18} />
    </View>
  );
}
