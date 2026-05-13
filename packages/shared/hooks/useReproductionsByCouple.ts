import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { Reproduction } from '../types';
import { sortReproductionsByDatePonteDesc } from './firestoreClientSort';
import { useFirestoreUid } from './useFirestoreUid';

const MAX = 40;

/**
 * Portées enregistrées pour un couple donné (vue depuis la cage ou ailleurs).
 */
export const useReproductionsByCouple = (coupleId: string | null | undefined) => {
  const uid = useFirestoreUid();
  const [reproductions, setReproductions] = useState<Reproduction[]>([]);
  const [loading, setLoading] = useState(Boolean(coupleId && uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !coupleId) {
      setReproductions([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    /** Pas d’`orderBy` Firestore : évite une contrainte d’index composite à trois champs ; tri côté client. */
    const q = query(
      collection(db, COLLECTIONS.REPRODUCTIONS),
      where('ownerUid', '==', uid),
      where('coupleId', '==', coupleId),
      limit(MAX),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setReproductions(
          sortReproductionsByDatePonteDesc(
            snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reproduction)),
          ),
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid, coupleId]);

  return { reproductions, loading, error };
};
