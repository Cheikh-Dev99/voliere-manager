import {
  cacheDirectory,
  documentDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Écrit un fichier texte dans le cache puis ouvre la feuille de partage (CSV, etc.).
 */
export async function shareUtf8TextFile(filename: string, utf8Content: string): Promise<void> {
  const base = cacheDirectory ?? documentDirectory;
  if (!base) {
    throw new Error('Aucun répertoire de cache disponible.');
  }
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uri = `${base}${safeName}`;
  await writeAsStringAsync(uri, utf8Content, {
    encoding: EncodingType.UTF8,
  });
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: safeName,
  });
}
