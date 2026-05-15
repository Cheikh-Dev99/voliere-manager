import { describe, expect, it } from 'vitest';
import { isGoogleAuthCancelled, messageForGoogleAuthError } from './googleAuthErrors';

describe('googleAuthErrors', () => {
  it('mappe auth/account-exists-with-different-credential', () => {
    const msg = messageForGoogleAuthError({ code: 'auth/account-exists-with-different-credential' });
    expect(msg).toMatch(/compte existe déjà/i);
  });

  it('détecte annulation popup via cause', () => {
    const wrapped = new Error('wrapper', {
      cause: { code: 'auth/popup-closed-by-user' },
    });
    expect(isGoogleAuthCancelled(wrapped)).toBe(true);
  });

  it('détecte annulation directe', () => {
    expect(isGoogleAuthCancelled({ code: 'auth/cancelled-popup-request' })).toBe(true);
  });
});
