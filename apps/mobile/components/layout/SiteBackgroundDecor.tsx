import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Path,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { Bird, Egg } from 'lucide-react-native';

/**
 * Fond filigrané (dégradés + grille + points + vignette + cercles + silhouettes) — aligné sur le web `SiteBackgroundDecor`.
 * Parent recommandé : `View` `flex:1` avec `position:'relative'` ; ce bloc est `absolute` plein écran, sans capture des touches.
 */
export function SiteBackgroundDecor() {
  const { width: w, height: h } = useWindowDimensions();
  const uid = useMemo(() => Math.random().toString(36).slice(2, 10), []);
  const meshId = `mesh-${uid}`;
  const dotsId = `dots-${uid}`;
  const vignetteId = `vig-${uid}`;
  const g1 = `g1-${uid}`;
  const g2 = `g2-${uid}`;

  const ringR = Math.min(w, h) * 0.42;
  const cx = w / 2;
  const cy = h * 0.42;

  return (
    <View
      style={styles.root}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.radialBlobTL} />
      <View style={styles.radialBlobBR} />

      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={meshId} width={52} height={52} patternUnits="userSpaceOnUse">
            <Path
              d="M0 52 L0 0 M26 0 L26 52 M52 0 L52 52 M0 26 L52 26"
              fill="none"
              stroke="rgba(13,148,136,0.07)"
              strokeWidth={0.65}
            />
          </Pattern>
          <Pattern id={dotsId} width={22} height={22} patternUnits="userSpaceOnUse">
            <Circle cx={2} cy={2} r={0.9} fill="rgba(15,118,110,0.06)" />
          </Pattern>
          <RadialGradient id={vignetteId} cx="50%" cy="42%" rx="65%" ry="65%" fx="50%" fy="42%">
            <Stop offset="0%" stopColor="rgb(45,212,191)" stopOpacity={0.09} />
            <Stop offset="55%" stopColor="rgb(13,148,136)" stopOpacity={0.03} />
            <Stop offset="100%" stopColor="rgb(15,23,42)" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={g1} cx="20%" cy="20%" rx="45%" ry="45%" fx="20%" fy="20%">
            <Stop offset="0%" stopColor="rgb(45,212,191)" stopOpacity={0.12} />
            <Stop offset="100%" stopColor="rgb(45,212,191)" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={g2} cx="80%" cy="80%" rx="50%" ry="50%" fx="80%" fy="80%">
            <Stop offset="0%" stopColor="rgb(148,163,184)" stopOpacity={0.2} />
            <Stop offset="100%" stopColor="rgb(148,163,184)" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={w} height={h} fill={`url(#${g1})`} />
        <Rect width={w} height={h} fill={`url(#${g2})`} />
        <Rect width={w} height={h} fill={`url(#${meshId})`} />
        <Rect width={w} height={h} fill={`url(#${dotsId})`} />
        <Rect width={w} height={h} fill={`url(#${vignetteId})`} />
        <Circle cx={cx} cy={cy} r={ringR * 0.78} fill="none" stroke="rgba(13,148,136,0.055)" strokeWidth={0.35 * (ringR / 78)} />
        <Circle cx={cx} cy={cy} r={ringR * 0.58} fill="none" stroke="rgba(13,148,136,0.055)" strokeWidth={0.28 * (ringR / 78)} />
        <Circle cx={cx} cy={cy} r={ringR * 0.38} fill="none" stroke="rgba(13,148,136,0.055)" strokeWidth={0.22 * (ringR / 78)} />
      </Svg>

      <View style={[styles.birdTL, { top: h * 0.04 }]} pointerEvents="none">
        <Bird size={Math.min(w * 0.38, 220)} color="rgba(13,148,136,0.09)" strokeWidth={0.9} />
      </View>
      <View style={[styles.birdBR, { bottom: h * 0.06 }]} pointerEvents="none">
        <View style={{ transform: [{ scaleX: -1 }, { rotate: '22deg' }] }}>
          <Bird size={Math.min(w * 0.42, 240)} color="rgba(15,118,110,0.075)" strokeWidth={0.85} />
        </View>
      </View>
      <View style={[styles.eggBL, { bottom: h * 0.12, left: w * 0.06 }]} pointerEvents="none">
        <View style={{ transform: [{ rotate: '18deg' }] }}>
          <Egg size={Math.min(w * 0.22, 120)} color="rgba(17,94,89,0.06)" strokeWidth={0.85} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  radialBlobTL: {
    position: 'absolute',
    left: -60,
    top: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(45,212,191,0.1)',
    opacity: 0.35,
  },
  radialBlobBR: {
    position: 'absolute',
    right: -80,
    bottom: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(148,163,184,0.14)',
    opacity: 0.35,
  },
  birdTL: {
    position: 'absolute',
    left: -36,
    transform: [{ rotate: '-16deg' }],
  },
  birdBR: {
    position: 'absolute',
    right: -44,
  },
  eggBL: {
    position: 'absolute',
  },
});
