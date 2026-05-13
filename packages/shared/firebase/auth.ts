import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './authClient';

export const login        = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logout       = () => signOut(auth);

export const onAuthChange = (cb: (u: User | null) => void) =>
  onAuthStateChanged(auth, cb);

// Compte démo jury
// Email    : admin@voliere.sn
// Password : Bakeli2026!
