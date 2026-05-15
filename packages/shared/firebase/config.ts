/// <reference path="./env-firebase.d.ts" />
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/** Ex. `gs://xxx.appspot.com` → `xxx.appspot.com` (évite les uploads Storage qui échouent si la valeur est copiée telle quelle). */
function normalizeStorageBucket(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  let s = String(raw).trim();
  if (!s) return undefined;
  if (s.startsWith('gs://')) s = s.slice(5);
  s = s.split('/')[0]?.trim() ?? '';
  return s || undefined;
}

/**
 * Pas de `import.meta` ici : Hermes (Expo / Metro) ne le supporte pas au parse.
 * - Expo : variables `EXPO_PUBLIC_FIREBASE_*` dans `.env`.
 * - Web Vite : `apps/web/vite.config.js` remplace `process.env.*` par des littéraux (`define`).
 *
 * Ne pas entourer `process.env` d’un `typeof process` : en navigateur `process` est absent,
 * Vite inline quand même les clés mais le ternaire prend la branche `undefined` → auth/invalid-api-key.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: normalizeStorageBucket(
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      process.env.VITE_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
};

// Éviter la double initialisation (hot reload Expo / Vite)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
