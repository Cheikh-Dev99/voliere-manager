/**
 * Races personnalisées — même clé JSON que le web (`PigeonFormPage.jsx` / localStorage),
 * stockée en AsyncStorage sur mobile.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LS_CUSTOM_RACES_KEY = 'voliere-manager-custom-races';

export async function readCustomRaces(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LS_CUSTOM_RACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())) : [];
  } catch {
    return [];
  }
}

export async function writeCustomRaces(list: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LS_CUSTOM_RACES_KEY, JSON.stringify(list));
  } catch {
    /* quota / stockage indisponible */
  }
}

export function mergeRacesCatalog(
  reference: readonly string[],
  custom: string[],
  /** Valeur courante du formulaire (ex. fiche existante) : reste visible même hors catalogue. */
  currentValue?: string,
): string[] {
  const set = new Set<string>([...reference, ...custom]);
  const cv = currentValue?.trim();
  if (cv) set.add(cv);
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

/** Ajoute une race perso si nouvelle ; retourne la liste perso mise à jour. */
export async function persistNewCustomRace(name: string, currentCustom: string[]): Promise<string[]> {
  const v = name.trim();
  if (!v) return currentCustom;
  if (currentCustom.some((p) => p.toLowerCase() === v.toLowerCase())) return currentCustom;
  const next = [...currentCustom, v];
  await writeCustomRaces(next);
  return next;
}
