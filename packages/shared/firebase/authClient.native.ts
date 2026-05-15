import './config';
import { getApp } from 'firebase/app';
import { getAuth, initializeAuth, type Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AsyncStorageLike = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

/** Chargé via `require` : les typings web de `firebase/auth` n’exportent pas `getReactNativePersistence` (build RN uniquement). */
function getReactNativePersistence(storage: AsyncStorageLike): Persistence {
  const { getReactNativePersistence: getRnPersistence } = require('firebase/auth') as {
    getReactNativePersistence: (s: AsyncStorageLike) => Persistence;
  };
  return getRnPersistence(storage);
}

function createAuth() {
  try {
    return initializeAuth(getApp(), {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
    if (code === 'auth/already-initialized') {
      return getAuth(getApp());
    }
    throw e;
  }
}

export const auth = createAuth();
auth.languageCode = 'fr';
