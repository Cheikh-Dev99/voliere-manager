const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  'auth/account-exists-with-different-credential':
    'Un compte existe déjà avec cet e-mail (connexion par mot de passe). Utilise l’e-mail / mot de passe ou lie les comptes dans Firebase.',
  'auth/popup-closed-by-user'       : 'Connexion Google annulée.',
  'auth/cancelled-popup-request'    : 'Connexion Google annulée.',
  'auth/popup-blocked-by-browser'   : 'La fenêtre Google a été bloquée. Autorise les pop-ups pour ce site.',
  'auth/operation-not-allowed'      : 'La connexion Google n’est pas activée dans Firebase (Authentication → Google).',
  'auth/network-request-failed'     : 'Erreur réseau. Vérifie ta connexion.',
  'auth/invalid-credential'         : 'Jeton Google invalide ou expiré. Réessaie.',
  'auth/user-disabled'              : 'Ce compte a été désactivé.',
};

function firebaseAuthCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code?: string }).code);
  }
  if (err instanceof Error && err.cause) return firebaseAuthCode(err.cause);
  return '';
}

export function messageForGoogleAuthError(err: unknown): string {
  const code = firebaseAuthCode(err);
  if (code && GOOGLE_ERROR_MESSAGES[code]) return GOOGLE_ERROR_MESSAGES[code];
  if (err instanceof Error && err.message) return err.message;
  return 'Connexion Google impossible. Réessaie.';
}

export function isGoogleAuthCancelled(err: unknown): boolean {
  const code = firebaseAuthCode(err);
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}
