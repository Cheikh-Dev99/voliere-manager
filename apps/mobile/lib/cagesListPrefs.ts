import AsyncStorage from '@react-native-async-storage/async-storage';

/** Même clé que le web (`CagesListPage`) pour cohérence documentaire. */
const LS_CAGES_FILTERS = 'voliere-manager:cages-list-filters';

export type CagesListPrefs = {
  sortBy: string;
  sortDir: 'asc' | 'desc';
  statut: string;
  voliere: string;
};

const DEFAULT_PREFS: CagesListPrefs = {
  sortBy: 'voliere',
  sortDir: 'asc',
  statut: 'ALL',
  voliere: 'ALL',
};

export async function readCagesListPrefs(): Promise<CagesListPrefs> {
  try {
    const raw = await AsyncStorage.getItem(LS_CAGES_FILTERS);
    if (!raw) return { ...DEFAULT_PREFS };
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      sortBy: ['numero', 'voliere', 'statut', 'superficie', 'nom'].includes(String(o.sortBy))
        ? String(o.sortBy)
        : 'voliere',
      sortDir: o.sortDir === 'desc' ? 'desc' : 'asc',
      statut: ['ALL', 'LIBRE', 'OCCUPE_PIGEON', 'OCCUPE_COUPLE'].includes(String(o.statut))
        ? String(o.statut)
        : 'ALL',
      voliere: typeof o.voliere === 'string' ? o.voliere : 'ALL',
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function writeCagesListPrefs(p: CagesListPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(LS_CAGES_FILTERS, JSON.stringify(p));
  } catch {
    /* quota / mode avion */
  }
}
