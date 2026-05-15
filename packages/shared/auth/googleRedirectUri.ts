export type GoogleRedirectUriInput = {
  appOwnership: string | null | undefined;
  owner?: string | null;
  slug: string;
  envOverride?: string | null;
  nativeRedirectUri: string;
};

/**
 * URI OAuth Google pour mobile.
 * - Expo Go : proxy HTTPS (client Web Google).
 * - Build installé : schéma natif (ex. voliere-manager://oauthredirect).
 */
export function resolveGoogleRedirectUri(input: GoogleRedirectUriInput): string {
  const override = input.envOverride?.trim();
  if (override) return override;

  const slug = input.slug.trim() || 'app';
  const owner = input.owner?.trim();

  if (input.appOwnership === 'expo') {
    if (!owner) {
      throw new Error(
        'Expo Go : définis "owner" dans app.json (ex. cheikhdev99) pour construire l’URI auth.expo.io.',
      );
    }
    return `https://auth.expo.io/@${owner}/${slug}`;
  }

  return input.nativeRedirectUri;
}
