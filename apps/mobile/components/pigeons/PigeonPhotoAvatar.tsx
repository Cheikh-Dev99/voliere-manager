import { Image, StyleSheet, View } from 'react-native';
import { Bird } from 'lucide-react-native';

import { usePigeonDisplayPhoto } from '../../hooks/usePigeonDisplayPhoto';
import { theme } from '../../constants/theme';

const SIZES = { sm: 48, md: 64, lg: 112 } as const;

export type PigeonPhotoRef = { id: string; photo?: string | null };

type Props = {
  pigeon: PigeonPhotoRef | null | undefined;
  size?: keyof typeof SIZES;
  /** Pastille circulaire ; sinon coins arrondis (comme les vignettes liste). */
  circle?: boolean;
};

export function PigeonPhotoAvatar({ pigeon, size = 'md', circle = false }: Props) {
  const dim = SIZES[size];
  const uri = usePigeonDisplayPhoto(pigeon);
  const borderRadius = circle ? dim / 2 : theme.radiusMd;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.img, { width: dim, height: dim, borderRadius }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        accessibilityLabel="Photo du pigeon"
      />
    );
  }

  return (
    <View
      style={[styles.placeholder, { width: dim, height: dim, borderRadius }]}
      accessibilityLabel="Aucune photo"
    >
      <Bird size={Math.round(dim * 0.42)} color={theme.slate500} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: theme.slate200 },
  placeholder: {
    backgroundColor: theme.slate100,
    borderWidth: 1,
    borderColor: theme.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
