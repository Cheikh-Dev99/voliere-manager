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
 * - Web Vite : `apps/web/vite.config.js` injecte les mêmes clés via `define` à partir de `VITE_FIREBASE_*`.
 */
const firebaseConfig = {
  apiKey:
    (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_FIREBASE_API_KEY : undefined) ||
    (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_API_KEY : undefined),
  authDomain:
    (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN : undefined) ||
    (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_AUTH_DOMAIN : undefined),
  projectId:
    (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID : undefined) ||
    (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_PROJECT_ID : undefined),
  storageBucket: normalizeStorageBucket(
    (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET : undefined) ||
      (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_STORAGE_BUCKET : undefined),
  ),
  messagingSenderId:
    (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : undefined) ||
    (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_MESSAGING_SENDER_ID : undefined),
  appId:
    (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_FIREBASE_APP_ID : undefined) ||
    (typeof process !== 'undefined' ? process.env.VITE_FIREBASE_APP_ID : undefined),
};

// Éviter la double initialisation (hot reload Expo / Vite)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
