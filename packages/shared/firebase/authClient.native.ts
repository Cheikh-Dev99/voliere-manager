import './config';
import { getApp } from 'firebase/app';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
