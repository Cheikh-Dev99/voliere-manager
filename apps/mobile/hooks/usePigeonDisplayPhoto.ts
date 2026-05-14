import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getPigeonDisplayPhotoUri, loadPigeonLocalPhoto } from '../utils/localPigeonPhoto';

type PigeonRef = { id: string; photo?: string | null } | null | undefined;

/**
 * URI pour afficher la photo d’un pigeon : AsyncStorage (data URL) prioritaire, sinon champ `photo` (URL).
 * Recharge quand l’écran reprend le focus ou que les données distantes changent.
 */
export function usePigeonDisplayPhoto(pigeon: PigeonRef): string | null {
  const [uri, setUri] = useState<string | null>(() => (pigeon ? getPigeonDisplayPhotoUri(pigeon) : null));

  const refresh = useCallback(() => {
    if (!pigeon?.id) {
      setUri(pigeon?.photo?.trim() || null);
      return;
    }
    void loadPigeonLocalPhoto(pigeon.id).then((local) => {
      const remote = pigeon.photo?.trim() || null;
      setUri(local?.trim() || remote || null);
    });
  }, [pigeon?.id, pigeon?.photo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return uri;
}
