import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { Cage } from '../types';
import { sortCagesByNumeroAsc } from './firestoreClientSort';
import { useFirestoreUid } from './useFirestoreUid';

export const useCages = () => {
  const uid = useFirestoreUid();
  const [cages, setCages]     = useState<Cage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setCages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    // Une seule clause where → pas d’index composite requis (évite FAILED_PRECONDITION si les index ne sont pas déployés).
    const q = query(collection(db, COLLECTIONS.CAGES), where('ownerUid', '==', uid));
    const unsub = onSnapshot(
      q,
      snap => {
        setCages(sortCagesByNumeroAsc(snap.docs.map(d => ({ id: d.id, ...d.data() } as Cage))));
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
    cages,
    loading,
    error,
    cagesLibres : cages.filter(c => c.statut === 'LIBRE'),
    stats: {
      total   : cages.length,
      libres  : cages.filter(c => c.statut === 'LIBRE').length,
      occupees: cages.filter(c => c.statut !== 'LIBRE').length,
      couples : cages.filter(c => c.statut === 'OCCUPE_COUPLE').length,
      pigeons : cages.filter(c => c.statut === 'OCCUPE_PIGEON').length,
    },
  };
};
