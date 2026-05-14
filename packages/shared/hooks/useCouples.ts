import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { Couple } from '../types';
import { sortCouplesByDateDebutDesc } from './firestoreClientSort';
import { useFirestoreUid } from './useFirestoreUid';

/**
 * Abonnement temps réel aux couples du compte.
 * @param actifsSeulement Si `true`, ne conserve que les couples au statut ACTIF (en cours, non rompus).
 */
export const useCouples = (actifsSeulement = false) => {
  const uid = useFirestoreUid();
  const [couples, setCouples] = useState<Couple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setCouples([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const q = query(collection(db, COLLECTIONS.COUPLES), where('ownerUid', '==', uid));

    const unsub = onSnapshot(
      q,
      snap => {
        let rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as Couple));
        if (actifsSeulement) rows = rows.filter(c => c.statut === 'ACTIF');
        setCouples(sortCouplesByDateDebutDesc(rows));
        setLoading(false);
        setError(null);
      },
      err => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [actifsSeulement, uid]);

  return {
    couples,
    loading,
    error,
    couplesActifs: couples.filter(c => c.statut === 'ACTIF'),
    stats: {
      total : couples.length,
      actifs: couples.filter(c => c.statut === 'ACTIF').length,
      rompus: couples.filter(c => c.statut === 'ROMPU').length,
    },
  };
};
