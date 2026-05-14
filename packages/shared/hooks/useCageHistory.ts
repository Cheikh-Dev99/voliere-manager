import { useState, useEffect } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import { CAGE_OCCUPANCY_EVENTS } from '../services/cagesService';
import type { CageOccupancyEvent } from '../types';

const MAX = 40;

/**
 * Historique des mouvements d’une cage (`cages/{cageId}/evenements`).
 */
export const useCageHistory = (cageId: string | null | undefined) => {
  const [events, setEvents] = useState<CageOccupancyEvent[]>([]);
  const [loading, setLoading] = useState(Boolean(cageId));
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!cageId) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, COLLECTIONS.CAGES, cageId, CAGE_OCCUPANCY_EVENTS),
      orderBy('createdAt', 'desc'),
      limit(MAX),
    );

    const unsub = onSnapshot(
      q,
      snap => {
        setEvents(
          snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<CageOccupancyEvent, 'id'>),
          })),
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
  }, [cageId]);

  return { events, loading, error };
};
