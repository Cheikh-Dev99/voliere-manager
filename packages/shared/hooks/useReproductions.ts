import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { Reproduction } from '../types';
import { sortReproductionsByDatePonteDesc } from './firestoreClientSort';
import { useFirestoreUid } from './useFirestoreUid';

export const useReproductions = () => {
  const uid = useFirestoreUid();
  const [reproductions, setReproductions] = useState<Reproduction[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setReproductions([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const q = query(collection(db, COLLECTIONS.REPRODUCTIONS), where('ownerUid', '==', uid));
    const unsub = onSnapshot(
      q,
      snap => {
        setReproductions(
          sortReproductionsByDatePonteDesc(
            snap.docs.map(d => ({ id: d.id, ...d.data() } as Reproduction)),
          ),
        );
        setLoading(false);
        setError(null);
      },
      err => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  return { reproductions, loading, error };
};
