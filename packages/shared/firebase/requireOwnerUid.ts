import { auth } from './authClient';

/**
 * UID du compte Firebase connecté (obligatoire pour toute écriture métier).
 */
export function requireOwnerUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Vous devez être connecté pour cette opération.');
  }
  return uid;
}
