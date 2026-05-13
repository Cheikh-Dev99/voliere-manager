/** Préfixe clés localStorage — photo fichier (data URL JPEG), par pigeon ou brouillon création. */
const LS_PREFIX = 'voliere-manager:local-pigeon-photo:'
const DRAFT_KEY = `${LS_PREFIX}draft`

function pigeonKey(pigeonId) {
  return `${LS_PREFIX}${pigeonId}`
}

/**
 * @param {string} pigeonId
 * @param {string} dataUrl
 */
export function savePigeonLocalPhoto(pigeonId, dataUrl) {
  if (!pigeonId || !dataUrl) return
  try {
    localStorage.setItem(pigeonKey(pigeonId), dataUrl)
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      throw new Error(
        'Espace de stockage local plein. Réduis la taille de l’image, retire d’autres photos locales ou vide le cache du navigateur.',
        { cause: e },
      )
    }
    throw e
  }
}

/** @param {string} pigeonId */
export function loadPigeonLocalPhoto(pigeonId) {
  if (!pigeonId) return null
  try {
    return localStorage.getItem(pigeonKey(pigeonId))
  } catch {
    return null
  }
}

/** @param {string} pigeonId */
export function clearPigeonLocalPhoto(pigeonId) {
  if (!pigeonId) return
  try {
    localStorage.removeItem(pigeonKey(pigeonId))
  } catch {
    /* ignore */
  }
}

/** Brouillon : formulaire « nouveau pigeon » avant enregistrement Firestore. */
export function saveDraftPigeonLocalPhoto(dataUrl) {
  if (!dataUrl) return
  try {
    localStorage.setItem(DRAFT_KEY, dataUrl)
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      throw new Error(
        'Espace de stockage local plein. Choisis une image plus petite ou retire une photo locale existante.',
        { cause: e },
      )
    }
    throw e
  }
}

export function loadDraftPigeonLocalPhoto() {
  try {
    return localStorage.getItem(DRAFT_KEY)
  } catch {
    return null
  }
}

export function clearDraftPigeonLocalPhoto() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

/** Après création : copie brouillon → clé définitive, puis efface le brouillon. */
export function migrateDraftPigeonLocalPhoto(pigeonId) {
  if (!pigeonId) return
  const draft = loadDraftPigeonLocalPhoto()
  if (!draft) return
  savePigeonLocalPhoto(pigeonId, draft)
  clearDraftPigeonLocalPhoto()
}

/**
 * Affichage : priorité à la copie locale (même navigateur), sinon URL Firestore.
 * @param {{ id?: string, photo?: string | null } | null | undefined} pigeon
 * @returns {string | null}
 */
export function getPigeonDisplayPhotoSrc(pigeon) {
  if (!pigeon?.id) return pigeon?.photo?.trim() || null
  const local = loadPigeonLocalPhoto(pigeon.id)
  if (local?.trim()) return local
  return pigeon.photo?.trim() || null
}

/** Estimation taille payload base64 (octets), sans le préfixe data:… */
function dataUrlPayloadBytes(dataUrl) {
  const i = dataUrl.indexOf(',')
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl
  return Math.floor((b64.length * 3) / 4)
}

const MAX_WIDTH = 1280
const MAX_PAYLOAD_BYTES = 750 * 1024

/**
 * Redimensionne et compresse en JPEG (data URL) pour limiter la taille en localStorage.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function compressImageFileToDataUrl(file) {
  if (!file?.type?.startsWith('image/')) {
    return Promise.reject(new Error('Choisis un fichier image (JPEG, PNG, WebP…).'))
  }

  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      let { width, height } = img
      if (width < 1 || height < 1) {
        reject(new Error('Image invalide ou vide.'))
        return
      }
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Navigateur incompatible (canvas).'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      let quality = 0.85
      let dataUrl = canvas.toDataURL('image/jpeg', quality)
      while (dataUrlPayloadBytes(dataUrl) > MAX_PAYLOAD_BYTES && quality > 0.38) {
        quality -= 0.07
        dataUrl = canvas.toDataURL('image/jpeg', quality)
      }
      if (dataUrlPayloadBytes(dataUrl) > MAX_PAYLOAD_BYTES) {
        reject(new Error('Image trop lourde même après compression — enregistre une version plus petite.'))
        return
      }
      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('Impossible de lire cette image (format non supporté par le navigateur ?).'))
    }
    img.src = blobUrl
  })
}
