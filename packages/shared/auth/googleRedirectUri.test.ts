import { describe, expect, it } from 'vitest';
import { resolveGoogleRedirectUri } from './googleRedirectUri';

describe('resolveGoogleRedirectUri', () => {
  it('utilise l’override env si présent', () => {
    expect(
      resolveGoogleRedirectUri({
        appOwnership: 'expo',
        owner       : 'cheikhdev99',
        slug        : 'voliere-manager',
        envOverride : 'https://custom.example/cb',
        nativeRedirectUri: 'voliere-manager://oauthredirect',
      }),
    ).toBe('https://custom.example/cb');
  });

  it('Expo Go → auth.expo.io', () => {
    expect(
      resolveGoogleRedirectUri({
        appOwnership     : 'expo',
        owner            : 'cheikhdev99',
        slug             : 'voliere-manager',
        nativeRedirectUri: 'exp://x',
      }),
    ).toBe('https://auth.expo.io/@cheikhdev99/voliere-manager');
  });

  it('build natif → schéma custom', () => {
    expect(
      resolveGoogleRedirectUri({
        appOwnership     : 'standalone',
        owner            : 'cheikhdev99',
        slug             : 'voliere-manager',
        nativeRedirectUri: 'voliere-manager://oauthredirect',
      }),
    ).toBe('voliere-manager://oauthredirect');
  });

  it('Expo Go sans owner → erreur explicite', () => {
    expect(() =>
      resolveGoogleRedirectUri({
        appOwnership     : 'expo',
        slug             : 'voliere-manager',
        nativeRedirectUri: 'exp://x',
      }),
    ).toThrow(/owner/);
  });
});
