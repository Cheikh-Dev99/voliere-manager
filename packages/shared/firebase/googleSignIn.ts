import { GoogleAuthProvider, signInWithCredential, type User } from 'firebase/auth';
import { auth } from './authClient';
import { syncGoogleUserProfile } from '../services/usersProfileService';

export { isGoogleAuthCancelled, messageForGoogleAuthError } from './googleAuthErrors';

/** Connexion Firebase à partir du jeton Google (mobile Expo). */
export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const cred = await signInWithCredential(auth, credential);
  await syncGoogleUserProfile(cred.user);
  return cred.user;
}
