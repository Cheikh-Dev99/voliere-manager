/**
 * Photos pigeon « fichier » : JPEG en data URL, stockées en local sur l’appareil
 * (AsyncStorage — équivalent mobile du localStorage navigateur du web).
 * Clés alignées sur `apps/web/src/utils/localPigeonPhoto.js`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAsync, EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const LS_PREFIX = 'voliere-manager:local-pigeon-photo:';
const DRAFT_KEY = `${LS_PREFIX}draft`;

const MEM_DRAFT = ':draft:';
const memory = new Map<string, string | null>();

function pigeonKey(pigeonId: string): string {
  return `${LS_PREFIX}${pigeonId}`;
}

function dataUrlPayloadBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

const MAX_WIDTH = 1280;
const MAX_PAYLOAD_BYTES = 750 * 1024;

async function jpegFileUriToDataUrl(fileUri: string): Promise<string> {
  try {
    const base64 = await readAsStringAsync(fileUri, { encoding: EncodingType.Base64 });
    return `data:image/jpeg;base64,${base64}`;
  } finally {
    try {
      await deleteAsync(fileUri, { idempotent: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Redimensionne (largeur max 1280) et compresse en JPEG data URL (cible ≤ ~750 Ko payload), comme le web.
 */
export async function compressPickerImageToJpegDataUrl(sourceUri: string): Promise<string> {
  let quality = 0.85;
  while (quality > 0.3) {
    const result = await manipulateAsync(
      sourceUri,
      [{ resize: { width: MAX_WIDTH } }],
      { compress: quality, format: SaveFormat.JPEG },
    );
    const dataUrl = await jpegFileUriToDataUrl(result.uri);
    if (dataUrlPayloadBytes(dataUrl) <= MAX_PAYLOAD_BYTES) {
      return dataUrl;
    }
    quality -= 0.07;
  }
  throw new Error('Image trop lourde même après compression — choisis une image plus petite.');
}

export function invalidatePigeonLocalPhotoCache(pigeonId?: string): void {
  if (pigeonId) memory.delete(pigeonId);
  else memory.clear();
}

export async function savePigeonLocalPhoto(pigeonId: string, dataUrl: string): Promise<void> {
  if (!pigeonId || !dataUrl) return;
  try {
    await AsyncStorage.setItem(pigeonKey(pigeonId), dataUrl);
    memory.set(pigeonId, dataUrl);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/storage|quota|full|size/i.test(msg)) {
      throw new Error(
        'Espace de stockage local insuffisant. Réduis la taille de l’image ou retire d’autres photos locales.',
      );
    }
    throw e;
  }
}

export async function loadPigeonLocalPhoto(pigeonId: string): Promise<string | null> {
  if (!pigeonId) return null;
  if (memory.has(pigeonId)) {
    const cached = memory.get(pigeonId);
    if (cached != null && cached !== '') return cached;
  }
  try {
    const v = await AsyncStorage.getItem(pigeonKey(pigeonId));
    const parsed = v?.trim() || null;
    if (parsed) memory.set(pigeonId, parsed);
    else memory.delete(pigeonId);
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPigeonLocalPhoto(pigeonId: string): Promise<void> {
  if (!pigeonId) return;
  try {
    await AsyncStorage.removeItem(pigeonKey(pigeonId));
  } catch {
    /* ignore */
  }
  memory.delete(pigeonId);
}

export async function saveDraftPigeonLocalPhoto(dataUrl: string): Promise<void> {
  if (!dataUrl) return;
  try {
    await AsyncStorage.setItem(DRAFT_KEY, dataUrl);
    memory.set(MEM_DRAFT, dataUrl);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/storage|quota|full|size/i.test(msg)) {
      throw new Error('Espace de stockage local insuffisant. Choisis une image plus petite.');
    }
    throw e;
  }
}

export async function loadDraftPigeonLocalPhoto(): Promise<string | null> {
  if (memory.has(MEM_DRAFT)) {
    const cached = memory.get(MEM_DRAFT);
    if (cached != null && cached !== '') return cached;
  }
  try {
    const v = await AsyncStorage.getItem(DRAFT_KEY);
    const parsed = v?.trim() || null;
    if (parsed) memory.set(MEM_DRAFT, parsed);
    else memory.delete(MEM_DRAFT);
    return parsed;
  } catch {
    return null;
  }
}

export async function clearDraftPigeonLocalPhoto(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
  memory.delete(MEM_DRAFT);
}

/** Après création Firestore : copie brouillon → clé définitive, puis efface le brouillon. */
export async function migrateDraftPigeonLocalPhoto(pigeonId: string): Promise<void> {
  if (!pigeonId) return;
  const draft = await loadDraftPigeonLocalPhoto();
  if (!draft) return;
  await savePigeonLocalPhoto(pigeonId, draft);
  await clearDraftPigeonLocalPhoto();
}

/** Priorité à la copie locale (cache mémoire), sinon URL Firestore / formulaire. */
export function getPigeonDisplayPhotoUri(pigeon: { id?: string; photo?: string | null } | null | undefined): string | null {
  if (!pigeon?.id) return pigeon?.photo?.trim() || null;
  if (memory.has(pigeon.id)) {
    const local = memory.get(pigeon.id);
    if (local?.trim()) return local;
  }
  return pigeon.photo?.trim() || null;
}
