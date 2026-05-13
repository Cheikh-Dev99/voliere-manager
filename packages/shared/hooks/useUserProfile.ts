import { useEffect, useState } from 'react';
import { subscribeUserProfile } from '../services/usersProfileService';
import type { UserProfile } from '../types';
import { useFirestoreUid } from './useFirestoreUid';

/**
 * Profil `users/{uid}` — créé automatiquement à la première consultation si absent.
 */
export function useUserProfile(authEmail: string | null | undefined) {
  const uid = useFirestoreUid();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !authEmail) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = subscribeUserProfile(
      uid,
      authEmail,
      (p) => {
        setProfile(p);
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [uid, authEmail]);

  return { profile, loading, error };
}
