import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  messageForGoogleAuthError,
  signInWithGoogleIdToken,
} from '@shared/firebase/googleSignIn';
import {
  GoogleOAuthCancelledError,
  GoogleOAuthConfigError,
  GoogleOAuthStateError,
  requestGoogleIdToken,
} from './googleOAuth';

WebBrowser.maybeCompleteAuthSession();

function readGoogleWebClientId(): string | undefined {
  const raw =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID : undefined;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

export function useGoogleSignIn() {
  const webClientId = readGoogleWebClientId();
  const configured = Boolean(webClientId);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    if (!configured || !webClientId) {
      setError(
        'Connexion Google non configurée : ajoute EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID dans apps/mobile/.env (ID client Web Firebase / Google Cloud).',
      );
      return;
    }

    setBusy(true);
    try {
      const idToken = await requestGoogleIdToken(webClientId);
      await signInWithGoogleIdToken(idToken);
    } catch (err: unknown) {
      if (err instanceof GoogleOAuthCancelledError) {
        return;
      }
      if (err instanceof GoogleOAuthConfigError || err instanceof GoogleOAuthStateError) {
        setError(err.message);
        return;
      }
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: string }).code)
          : '';
      if (code === 'auth/account-exists-with-different-credential') {
        setError(
          'Un compte existe déjà avec cet e-mail (mot de passe). Utilise l’onglet Connexion avec e-mail / mot de passe.',
        );
        return;
      }
      setError(messageForGoogleAuthError(err));
    } finally {
      setBusy(false);
    }
  }, [configured, webClientId]);

  return {
    signInWithGoogle,
    googleBusy : busy,
    googleError: error,
    googleReady: configured,
    clearGoogleError: () => setError(null),
  };
}
