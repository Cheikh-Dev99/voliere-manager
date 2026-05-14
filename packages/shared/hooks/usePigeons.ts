import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { Pigeon } from '../types';
import { sortPigeonsByMatriculeAsc } from './firestoreClientSort';
import { useFirestoreUid } from './useFirestoreUid';

function isArchivedPigeon(p: Pigeon): boolean {
  return p.deletedAt != null;
}

/**
 * @param includeDeleted Si `true`, `pigeons` contient aussi les fiches soft-deleted (`deletedAt`).
 *                        Sinon `pigeons` = effectif uniquement. `archivedPigeons` est toujours rempli.
 */
export const usePigeons = (includeDeleted = false) => {
  const uid = useFirestoreUid();
  const [allRows, setAllRows] = useState<Pigeon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setAllRows([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const q = query(collection(db, COLLECTIONS.PIGEONS), where('ownerUid', '==', uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = sortPigeonsByMatriculeAsc(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Pigeon)),
        );
        setAllRows(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  const effectif = useMemo(() => allRows.filter((p) => !isArchivedPigeon(p)), [allRows]);
  const archives = useMemo(() => allRows.filter((p) => isArchivedPigeon(p)), [allRows]);

  const pigeons = includeDeleted ? allRows : effectif;

  return {
    pigeons,
    /** Pigeons avec `deletedAt` (soft delete / archivés). */
    archivedPigeons: archives,
    loading,
    error,
    pigeonsActifs: effectif.filter((p) => p.statut === 'ACTIF'),
    males: effectif.filter((p) => p.sexe === 'MALE' && p.statut === 'ACTIF'),
    femelles: effectif.filter((p) => p.sexe === 'FEMALE' && p.statut === 'ACTIF'),
    stats: {
      total: effectif.length,
      actifs: effectif.filter((p) => p.statut === 'ACTIF').length,
      vendus: effectif.filter((p) => p.statut === 'VENDU').length,
      morts: effectif.filter((p) => p.statut === 'MORT').length,
      perdus: effectif.filter((p) => p.statut === 'PERDU').length,
    },
  };
};
