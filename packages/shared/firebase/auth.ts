import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './authClient';
import { mergeUserProfileOnRegister } from '../services/usersProfileService';

export const login        = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logout       = () => signOut(auth);

export const onAuthChange = (cb: (u: User | null) => void) =>
  onAuthStateChanged(auth, cb);

/**
 * Inscription e-mail / mot de passe + profil Firestore (aligné web `authStore.register`).
 */
export async function registerWithProfile(
  email: string,
  password: string,
  profile: { prenom: string; nom: string; nomElevage?: string },
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await mergeUserProfileOnRegister(cred.user.uid, cred.user.email || email.trim(), profile);
  return cred.user;
}

/** Réinitialisation mot de passe (sans URL de retour — adapté mobile / deep link futur). */
export const sendPasswordReset = (email: string) =>
  sendPasswordResetEmail(auth, email.trim());

// Compte démo jury
// Email    : admin@voliere.sn
// Password : Bakeli2026!
