import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth } from '../firebase/authClient';
import { storage } from '../firebase/config';

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIME = /^image\/(jpeg|jpg|png|gif|webp)$/i;

const EXT_TO_MIME: Record<string, string> = {
  jpg : 'image/jpeg',
  jpeg: 'image/jpeg',
  png : 'image/png',
  gif : 'image/gif',
  webp: 'image/webp',
};

function guessContentType(file: File): string {
  if (file.type && ALLOWED_MIME.test(file.type)) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_MIME[ext] ?? 'image/jpeg';
}

function assertStorageConfigured(): void {
  const bucket = storage.app.options.storageBucket;
  if (bucket == null || String(bucket).trim() === '') {
    throw new Error(
      'Firebase Storage n’est pas configuré : renseigne VITE_FIREBASE_STORAGE_BUCKET dans apps/web/.env.local ' +
        '(valeur du type mon-projet.appspot.com, visible dans Console Firebase → Paramètres du projet → Tes applications).',
    );
  }
}

function mapStorageError(err: unknown): Error {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: string }).code) : '';
  if (!code.startsWith('storage/')) {
    return err instanceof Error ? err : new Error(String(err));
  }

  const msg = typeof err === 'object' && err !== null && 'message' in err ? String((err as { message?: string }).message) : '';

  if (code === 'storage/unauthorized') {
    return new Error(
      'Permission refusée sur Firebase Storage : dans la console Firebase → Storage → Règles, autorise l’écriture pour ' +
        'les utilisateurs authentifiés sur le chemin `pigeons/{userId}/...` (voir `firebase/storage.rules` dans le dépôt).',
    );
  }
  if (code === 'storage/unauthenticated') {
    return new Error('Tu n’es pas connecté : reconnecte-toi puis réessaie l’envoi de la photo.');
  }
  if (code === 'storage/unknown' || code === 'storage/bucket-not-found' || code === 'storage/project-not-found') {
    return new Error(
      'Storage inaccessible (bucket ou projet). Active « Storage » dans la console Firebase, vérifie VITE_FIREBASE_STORAGE_BUCKET ' +
        '(ex. mon-projet.appspot.com, sans gs://), puis redémarre `npm run dev`.',
    );
  }
  if (code === 'storage/quota-exceeded') {
    return new Error('Quota Firebase Storage dépassé — voir la console Firebase (facturation / limites).');
  }
  if (code === 'storage/canceled') {
    return new Error('Envoi annulé (délai dépassé ou annulation). Réessaie avec une image plus légère ou une meilleure connexion.');
  }
  if (code === 'storage/retry-limit-exceeded' || code === 'storage/invalid-checksum') {
    return new Error('Échec réseau pendant l’envoi — réessaie.');
  }
  if (code === 'storage/object-not-found') {
    return new Error('Objet Storage introuvable après envoi — vérifie que le bucket est correct.');
  }
  if (msg) return new Error(msg);
  return new Error('Erreur inconnue pendant l’envoi vers Storage.');
}

/**
 * Envoie une image pigeon vers Firebase Storage et retourne l’URL publique de téléchargement.
 * Chemin : `pigeons/{uid}/{timestamp}_{random}.{ext}`
 */
export async function uploadPigeonPhoto(file: File, timeoutMs = 45000): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Connexion requise pour envoyer une photo.');

  assertStorageConfigured();

  const contentType = guessContentType(file);
  if (!ALLOWED_MIME.test(contentType)) {
    const hint =
      /heic|heif/i.test(file.name) || /image\/hei/i.test(file.type)
        ? ' Les photos iPhone (HEIC) ne sont pas acceptées ici : exporte l’image en JPEG ou PNG puis réessaie.'
        : '';
    throw new Error(
      `Format « ${file.type || 'inconnu'} » non pris en charge. Utilise JPEG, PNG, GIF ou WebP (max 5 Mo).${hint}`,
    );
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image trop volumineuse (maximum 5 Mo).');
  }

  const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const storageRef = ref(storage, `pigeons/${user.uid}/${name}`);

  const task = uploadBytesResumable(storageRef, file, { contentType });

  const finished = new Promise<void>((resolve, reject) => {
    task.on('state_changed', () => {}, reject, () => resolve());
  });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        task.cancel();
      } catch {
        /* ignore */
      }
      reject(
        new Error(
          'Délai d’envoi dépassé. Vérifie : (1) Storage activé sur le projet Firebase, (2) VITE_FIREBASE_STORAGE_BUCKET correct, ' +
            '(3) règles Storage autorisant l’écriture pour ton utilisateur connecté, (4) pas de pare-feu bloquant.',
        ),
      );
    }, timeoutMs);
  });

  try {
    await Promise.race([finished, timedOut]);
  } catch (e) {
    throw mapStorageError(e);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }

  try {
    return await getDownloadURL(task.snapshot.ref);
  } catch (e) {
    throw mapStorageError(e);
  }
}
