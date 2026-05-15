import type { ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { FadeInView } from '../ui/FadeInView';

type TabScreenFadeProps = {
  children: ReactNode;
};

/**
 * Rejoue une entrée légère au retour sur l’onglet / l’écran.
 * Le premier callback de focus est ignoré : sinon `replayToken` passe 0→1 tout de suite après
 * le montage et `FadeInView` relance une entrée « plein écran » (opacité à 0) — le GIF de
 * chargement semble s’afficher deux fois.
 */
export function TabScreenFade({ children }: TabScreenFadeProps) {
  const [enterToken, setEnterToken] = useState(0);
  const skipFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (skipFirstFocus.current) {
        skipFirstFocus.current = false;
        return;
      }
      setEnterToken((t) => t + 1);
    }, []),
  );

  return (
    <FadeInView replayToken={enterToken} style={styles.fill} offsetY={30}>
      {children}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
