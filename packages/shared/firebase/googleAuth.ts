import { GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth';
import { auth } from './authClient';
import { syncGoogleUserProfile } from '../services/usersProfileService';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account', hl: 'fr' });

/** Connexion / inscription via popup Google (navigateur). */
export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  await syncGoogleUserProfile(cred.user);
  return cred.user;
}
