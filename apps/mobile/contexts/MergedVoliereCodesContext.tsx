import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { auth } from '@shared/firebase/authClient';
import { useCages } from '@shared/hooks/useCages';
import { useUserProfile } from '@shared/hooks/useUserProfile';
import { mergeProfileVoliereCodesWithCages } from '@shared/utils/voliereCodesMerge';

const MergedVoliereCodesContext = createContext<string[] | undefined>(undefined);

/**
 * Un seul couple d’abonnements Firestore (cages + profil) pour toute la zone authentifiée.
 */
export function MergedVoliereCodesProvider({ children }: { children: ReactNode }) {
  const { cages } = useCages();
  const [email, setEmail] = useState(() => auth.currentUser?.email ?? '');

  useEffect(() => auth.onAuthStateChanged((u) => setEmail(u?.email ?? '')), []);

  const { profile } = useUserProfile(email || undefined);

  const merged = useMemo(
    () => mergeProfileVoliereCodesWithCages(profile?.voliereCodes, cages),
    [profile?.voliereCodes, cages],
  );

  return <MergedVoliereCodesContext.Provider value={merged}>{children}</MergedVoliereCodesContext.Provider>;
}

/**
 * Liste des volières (noms courts) = profil Firestore + cages, alignée sur le web.
 * Doit être utilisé sous `MergedVoliereCodesProvider` (layout `(app)`).
 */
export function useMergedVoliereCodes(): string[] {
  const value = useContext(MergedVoliereCodesContext);
  if (value === undefined) {
    throw new Error('useMergedVoliereCodes doit être utilisé dans MergedVoliereCodesProvider (layout (app)).');
  }
  return value;
}
