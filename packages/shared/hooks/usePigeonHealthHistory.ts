import { useEffect, useMemo, useState } from 'react';

function pigeonIdsKey(pigeonIds: (string | null | undefined)[] | undefined): string {
  const u = [...new Set((pigeonIds ?? []).filter((id): id is string => Boolean(id)))];
  u.sort();
  return u.join('|');
}
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import { PIGEON_HEALTH_EVENTS } from '../services/pigeonHealthService';
import type { PigeonHealthEvent } from '../types';

const PER_PIGEON_MAX = 60;

function sortMergedDesc<T extends PigeonHealthEvent>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = a.occurredAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
    const tb = b.occurredAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

/**
 * Écoute le carnet santé pour une liste de pigeons (ex. occupant(s) d’une cage).
 * Fusionne et trie par date d’événement (plus récent en premier).
 */
export type PigeonHealthEventAugmented = PigeonHealthEvent & { sourcePigeonId: string };

export const usePigeonHealthHistory = (pigeonIds: (string | null | undefined)[]) => {
  const idsKey = pigeonIdsKey(pigeonIds);
  const ids = idsKey ? idsKey.split('|') : [];

  const [byPigeon, setByPigeon] = useState<Map<string, PigeonHealthEventAugmented[]>>(new Map());
  const [loading, setLoading] = useState(Boolean(ids.length));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ids.length) {
      setByPigeon(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const map = new Map<string, PigeonHealthEventAugmented[]>();
    const unsubs = ids.map((pigeonId) => {
      const q = query(
        collection(db, COLLECTIONS.PIGEONS, pigeonId, PIGEON_HEALTH_EVENTS),
        orderBy('occurredAt', 'desc'),
        limit(PER_PIGEON_MAX),
      );
      return onSnapshot(
        q,
        (snap) => {
          const rows: PigeonHealthEventAugmented[] = snap.docs.map((d) => ({
            id: d.id,
            sourcePigeonId: pigeonId,
            ...(d.data() as Omit<PigeonHealthEvent, 'id'>),
          }));
          map.set(pigeonId, rows);
          setByPigeon(new Map(map));
          setLoading(false);
          setError(null);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        },
      );
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [idsKey]);

  const mergedSorted = useMemo(() => {
    const all: PigeonHealthEventAugmented[] = [];
    for (const pid of ids) {
      const rows = byPigeon.get(pid) ?? [];
      for (const ev of rows) {
        all.push(ev);
      }
    }
    return sortMergedDesc(all);
  }, [byPigeon, idsKey]);

  return {
    byPigeon,
    mergedSorted,
    loading,
    error,
  };
};
