import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { Sortie } from '../types';
import { sortSortiesByDateDesc } from './firestoreClientSort';
import { useFirestoreUid } from './useFirestoreUid';

export const useSorties = () => {
  const uid = useFirestoreUid();
  const [sorties, setSorties] = useState<Sortie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setSorties([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const q = query(collection(db, COLLECTIONS.SORTIES), where('ownerUid', '==', uid));
    const unsub = onSnapshot(
      q,
      snap => {
        setSorties(
          sortSortiesByDateDesc(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sortie))),
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

  return {
    sorties,
    loading,
    error,
    stats: {
      total : sorties.length,
      ventes: sorties.filter(s => s.type === 'VENTE').length,
      deces : sorties.filter(s => s.type === 'DECES').length,
      pertes: sorties.filter(s => s.type === 'PERTE').length,
    },
  };
};
