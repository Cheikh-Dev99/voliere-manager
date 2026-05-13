import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { Pigeon } from '../types';
import { sortPigeonsByMatriculeAsc } from './firestoreClientSort';
import { useFirestoreUid } from './useFirestoreUid';

export const usePigeons = (includeDeleted = false) => {
  const uid = useFirestoreUid();
  const [pigeons, setPigeons] = useState<Pigeon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setPigeons([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const q = query(collection(db, COLLECTIONS.PIGEONS), where('ownerUid', '==', uid));

    const unsub = onSnapshot(
      q,
      snap => {
        const rows = sortPigeonsByMatriculeAsc(
          snap.docs.map(d => ({ id: d.id, ...d.data() } as Pigeon)),
        );
        const filtered = includeDeleted
          ? rows
          : rows.filter(p => !p.deletedAt);
        setPigeons(filtered);
        setLoading(false);
        setError(null);
      },
      err => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [includeDeleted, uid]);

  return {
    pigeons,
    loading,
    error,
    pigeonsActifs : pigeons.filter(p => p.statut === 'ACTIF'),
    males         : pigeons.filter(p => p.sexe === 'MALE'   && p.statut === 'ACTIF'),
    femelles      : pigeons.filter(p => p.sexe === 'FEMALE' && p.statut === 'ACTIF'),
    stats: {
      total  : pigeons.length,
      actifs : pigeons.filter(p => p.statut === 'ACTIF').length,
      vendus : pigeons.filter(p => p.statut === 'VENDU').length,
      morts  : pigeons.filter(p => p.statut === 'MORT').length,
      perdus : pigeons.filter(p => p.statut === 'PERDU').length,
    },
  };
};
