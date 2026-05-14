/**
 * Couleurs perso `{ nom, hex }` — même clé JSON que le web (`PigeonFormPage.jsx`),
 * stockée en AsyncStorage sur mobile.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LS_CUSTOM_COULEURS_KEY = 'voliere-manager-custom-couleurs';

export type CustomCouleur = { nom: string; hex: string };

export async function readCustomCouleurs(): Promise<CustomCouleur[]> {
  try {
    const raw = await AsyncStorage.getItem(LS_CUSTOM_COULEURS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): CustomCouleur | null => {
        if (typeof item === 'string' && item.trim()) {
          return { nom: item.trim(), hex: '#64748b' };
        }
        if (item && typeof item === 'object' && typeof (item as { nom?: string }).nom === 'string') {
          const nom = (item as { nom: string }).nom.trim();
          if (!nom) return null;
          const hexRaw = (item as { hex?: string }).hex;
          const hex =
            typeof hexRaw === 'string' && /^#[0-9A-Fa-f]{6}$/i.test(hexRaw) ? hexRaw.toLowerCase() : '#64748b';
          return { nom, hex };
        }
        return null;
      })
      .filter((x): x is CustomCouleur => x !== null);
  } catch {
    return [];
  }
}

export async function writeCustomCouleurs(list: CustomCouleur[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LS_CUSTOM_COULEURS_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

export function mergeCouleurNoms(
  referenceNoms: readonly string[],
  custom: CustomCouleur[],
  currentValue?: string,
): string[] {
  const set = new Set<string>([...referenceNoms, ...custom.map((c) => c.nom)]);
  const cv = currentValue?.trim();
  if (cv) set.add(cv);
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

/** Insère ou remplace (insensible à la casse) une couleur perso. */
export async function upsertCustomCouleur(
  nom: string,
  hex: string,
  current: CustomCouleur[],
): Promise<CustomCouleur[]> {
  const n = nom.trim();
  if (!n) return current;
  const h = /^#[0-9A-Fa-f]{6}$/i.test(hex) ? hex.toLowerCase() : '#64748b';
  const filtered = current.filter((p) => p.nom.toLowerCase() !== n.toLowerCase());
  const next = [...filtered, { nom: n, hex: h }];
  await writeCustomCouleurs(next);
  return next;
}
