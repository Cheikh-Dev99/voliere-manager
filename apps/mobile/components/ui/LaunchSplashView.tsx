import { useMemo } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

/** Logo bien visible au démarrage (avant l’écran de connexion). */
const LOGO_WIDTH = Math.min(SCREEN_W * 0.82, 380);

/**
 * Écran de lancement : fond blanc, logo centré (identique au flux web / login).
 */
export function LaunchSplashView() {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
        },
        logo: {
          width: LOGO_WIDTH,
          height: LOGO_WIDTH,
          maxHeight: SCREEN_W * 0.55,
        },
      }),
    [],
  );

  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Volière Manager"
      />
    </View>
  );
}
