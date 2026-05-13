import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { UserProfile } from '../types';

const DEFAULT_ELEVAGE = 'Ma volière';

function parseVoliereCodesField(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (t) out.push(t);
  }
  return out.length ? out : undefined;
}

function profileFromSnap(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    id          : uid,
    email       : typeof data.email === 'string' ? data.email : undefined,
    prenom      : typeof data.prenom === 'string' ? data.prenom : undefined,
    nom         : typeof data.nom === 'string' ? data.nom : undefined,
    nomElevage  : typeof data.nomElevage === 'string' ? data.nomElevage : undefined,
    voliereCodes: parseVoliereCodesField(data.voliereCodes),
    createdAt   : data.createdAt as UserProfile['createdAt'],
    updatedAt   : data.updatedAt as UserProfile['updatedAt'],
  };
}

/**
 * Abonnement temps réel au document profil ; crée le document par défaut s’il est absent.
 */
export function subscribeUserProfile(
  uid: string,
  emailFallback: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (msg: string) => void,
): () => void {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  let creating = false;

  return onSnapshot(
    ref,
    async (snap) => {
      if (!snap.exists()) {
        if (creating) return;
        creating = true;
        try {
          await setDoc(ref, {
            email        : emailFallback,
            prenom       : '',
            nom          : '',
            nomElevage   : DEFAULT_ELEVAGE,
            voliereCodes : ['A'],
            createdAt    : serverTimestamp(),
            updatedAt    : serverTimestamp(),
          });
        } finally {
          creating = false;
        }
        return;
      }
      onData(profileFromSnap(uid, snap.data() as Record<string, unknown>));
    },
    (err) => {
      onError?.(err.message);
    },
  );
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, 'prenom' | 'nom' | 'nomElevage' | 'email' | 'voliereCodes'>>,
): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Crée ou fusionne le profil Firestore juste après l’inscription Firebase Auth
 * (évite d’attendre le premier snapshot et écrase les chaînes vides par défaut).
 */
export async function mergeUserProfileOnRegister(
  uid: string,
  email: string,
  fields: { prenom: string; nom: string; nomElevage?: string },
): Promise<void> {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  const elevage = fields.nomElevage?.trim();
  await setDoc(
    ref,
    {
      email,
      prenom    : fields.prenom.trim(),
      nom       : fields.nom.trim(),
      nomElevage: elevage && elevage.length > 0 ? elevage : DEFAULT_ELEVAGE,
      voliereCodes: ['A'],
      createdAt : serverTimestamp(),
      updatedAt : serverTimestamp(),
    },
    { merge: true },
  );
}
