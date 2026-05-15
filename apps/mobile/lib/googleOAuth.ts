import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { resolveGoogleRedirectUri } from '@shared/auth/googleRedirectUri';

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function toUrlSafeBase64(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function randomVerifier(length = 64): string {
  const bytes = Crypto.getRandomValues(new Uint8Array(length));
  const chars: string[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    chars.push(CHARSET[bytes[i] % CHARSET.length]);
  }
  return chars.join('');
}

async function deriveChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return toUrlSafeBase64(digest);
}

async function randomOAuthState(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getGoogleRedirectUri(): string {
  return resolveGoogleRedirectUri({
    appOwnership: Constants.appOwnership,
    owner        : Constants.expoConfig?.owner,
    slug         : Constants.expoConfig?.slug ?? 'voliere-manager',
    envOverride  :
      typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI : undefined,
    nativeRedirectUri: Linking.createURL('oauthredirect'),
  });
}

export class GoogleOAuthCancelledError extends Error {
  constructor() {
    super('Connexion Google annulée.');
    this.name = 'GoogleOAuthCancelledError';
  }
}

export class GoogleOAuthConfigError extends Error {
  readonly redirectUri: string;

  constructor(redirectUri: string) {
    super(
      `Configuration Google OAuth : ajoute cette URI de redirection autorisée sur le client Web ` +
        `(Google Cloud → Identifiants → client OAuth « Web ») :\n${redirectUri}`,
    );
    this.name = 'GoogleOAuthConfigError';
    this.redirectUri = redirectUri;
  }
}

export class GoogleOAuthStateError extends Error {
  constructor() {
    super('Réponse Google invalide (état OAuth). Réessaie.');
    this.name = 'GoogleOAuthStateError';
  }
}

/**
 * OAuth Google (code + PKCE + state) → id_token pour Firebase.
 */
export async function requestGoogleIdToken(webClientId: string): Promise<string> {
  const redirectUri = getGoogleRedirectUri();
  const oauthState = await randomOAuthState();

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.info('[Google OAuth] redirect_uri =', redirectUri);
  }

  const codeVerifier = randomVerifier(64);
  const codeChallenge = await deriveChallenge(codeVerifier);

  const authParams = new URLSearchParams({
    client_id             : webClientId,
    redirect_uri          : redirectUri,
    response_type         : 'code',
    scope                 : 'openid profile email',
    code_challenge        : codeChallenge,
    code_challenge_method : 'S256',
    prompt                : 'select_account',
    state                 : oauthState,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;

  const browserResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
    throw new GoogleOAuthCancelledError();
  }
  if (browserResult.type !== 'success') {
    throw new Error('Connexion Google refusée ou interrompue.');
  }

  const parsed = Linking.parse(browserResult.url);
  const returnedState = parsed.queryParams?.state;
  const stateValue = Array.isArray(returnedState) ? returnedState[0] : returnedState;
  if (stateValue !== oauthState) {
    throw new GoogleOAuthStateError();
  }

  const codeParam = parsed.queryParams?.code;
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;

  const errParam = parsed.queryParams?.error;
  const errCode = Array.isArray(errParam) ? errParam[0] : errParam;
  if (typeof errCode === 'string' && errCode) {
    if (errCode === 'invalid_request' || errCode === 'redirect_uri_mismatch') {
      throw new GoogleOAuthConfigError(redirectUri);
    }
    throw new Error(`Google OAuth : ${errCode}`);
  }

  if (typeof code !== 'string' || !code) {
    throw new Error('Code d’autorisation Google manquant.');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method : 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body   : new URLSearchParams({
      client_id    : webClientId,
      code,
      redirect_uri : redirectUri,
      grant_type   : 'authorization_code',
      code_verifier: codeVerifier,
    }).toString(),
  });

  const tokenJson = (await tokenRes.json()) as {
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.id_token) {
    const detail = tokenJson.error_description || tokenJson.error || `HTTP ${tokenRes.status}`;
    if (
      tokenJson.error === 'invalid_request' ||
      tokenJson.error === 'redirect_uri_mismatch' ||
      /redirect_uri/i.test(detail)
    ) {
      throw new GoogleOAuthConfigError(redirectUri);
    }
    throw new Error(`Échange de jeton Google impossible : ${detail}`);
  }

  return tokenJson.id_token;
}
