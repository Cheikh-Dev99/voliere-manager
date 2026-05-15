import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { motionDuration } from '../../constants/palettes';

type FadeInViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Délai avant l’animation (ms). */
  delay?: number;
  /** Décalage vertical initial (px). */
  offsetY?: number;
  /** Incrémenter pour rejouer (ex. focus onglet). */
  replayToken?: number;
};

/**
 * Entrée visible du contenu (listes, onglets, écrans empilés) — aligné sur `.vm-page-enter` web.
 * Rejouer avec `replayToken` > 0 sans repartir de l’opacité 0 évite un « second chargement » visuel
 * (GIF masqué puis réaffiché).
 */
export function FadeInView({ children, style, delay = 0, offsetY = 20, replayToken = 0 }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offsetY)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const prevReplay = useRef<number | null>(null);

  useEffect(() => {
    const isSoftReplay = prevReplay.current !== null && replayToken > prevReplay.current;
    prevReplay.current = replayToken;

    if (isSoftReplay) {
      opacity.setValue(0.9);
      translateY.setValue(Math.min(offsetY, 14));
      scale.setValue(0.985);
    } else {
      opacity.setValue(0);
      translateY.setValue(offsetY);
      scale.setValue(0.96);
    }

    const duration = isSoftReplay ? motionDuration.base : motionDuration.slow;
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => {
      anim.stop();
    };
  }, [delay, offsetY, opacity, scale, translateY, replayToken]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }, { scale }] }]}>
      {children}
    </Animated.View>
  );
}
