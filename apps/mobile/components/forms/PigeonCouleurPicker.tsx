import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, ChevronLeft, Pipette, Plus, Search, X } from 'lucide-react-native';

import { hexForCouleurReference, PIGEON_COULEURS_NOMS_REFERENCE } from '@shared/data/pigeonCouleurHex';

import { appFeedback } from '../../lib/appFeedback';
import { theme } from '../../constants/theme';
import {
  mergeCouleurNoms,
  readCustomCouleurs,
  type CustomCouleur,
  upsertCustomCouleur,
} from '../../utils/pigeonCustomCouleursStorage';

type Props = {
  value: string;
  onChange: (couleur: string) => void;
  error?: string;
  onClearError?: () => void;
};

const MAX_BROWSE = 100;
const MAX_FILTERED = 150;

/** Pastilles rapides (alignées sur le web `CouleurCombobox.jsx`). */
const COULEUR_PRESETS = [
  '#f4f4f5',
  '#e2e8f0',
  '#94a3b8',
  '#64748b',
  '#334155',
  '#0f172a',
  '#5b7fc7',
  '#3d5a80',
  '#1e3a5f',
  '#38bdf8',
  '#0ea5e9',
  '#0369a1',
  '#22c55e',
  '#15803d',
  '#14532d',
  '#eab308',
  '#ca8a04',
  '#a16207',
  '#fdba74',
  '#ea580c',
  '#c2410c',
  '#f87171',
  '#dc2626',
  '#991b1b',
  '#c084fc',
  '#7c3aed',
  '#5b21b6',
  '#fbcfe8',
  '#db2777',
  '#831843',
] as const;

function extrasMapFrom(custom: CustomCouleur[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of custom) {
    if (e.nom?.trim() && e.hex) m.set(e.nom.trim().toLowerCase(), e.hex);
  }
  return m;
}

function resolveDisplayHex(nom: string, extras: Map<string, string>): string {
  const t = nom?.trim();
  if (!t) return '#94a3b8';
  const fromExtra = extras.get(t.toLowerCase());
  if (fromExtra && /^#[0-9A-Fa-f]{6}$/i.test(fromExtra)) return fromExtra;
  return hexForCouleurReference(t) ?? '#94a3b8';
}

function normalizeHexInput(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!s.startsWith('#')) s = `#${s}`;
  if (/^#[0-9A-Fa-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/i.test(s)) {
    const a = s.slice(1);
    return `#${a[0]}${a[0]}${a[1]}${a[1]}${a[2]}${a[2]}`.toLowerCase();
  }
  return null;
}

function Swatch({ hex, size = 22 }: { hex: string; size?: number }) {
  return (
    <View
      style={[
        styles.swatch,
        { width: size, height: size, borderRadius: size / 4, backgroundColor: hex },
      ]}
      accessibilityElementsHidden
    />
  );
}

export function PigeonCouleurPicker({ value, onChange, error, onClearError }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'browse' | 'palette'>('browse');
  const [searchQ, setSearchQ] = useState('');
  const [customCouleurs, setCustomCouleurs] = useState<CustomCouleur[]>([]);
  const [pendingName, setPendingName] = useState('');
  const [pendingHex, setPendingHex] = useState('#64748b');
  const [hexInput, setHexInput] = useState('#64748b');

  const loadCustom = useCallback(async () => {
    const list = await readCustomCouleurs();
    setCustomCouleurs(list);
  }, []);

  useEffect(() => {
    void loadCustom();
  }, [loadCustom]);

  const extrasMap = useMemo(() => extrasMapFrom(customCouleurs), [customCouleurs]);

  const allNoms = useMemo(
    () => mergeCouleurNoms(PIGEON_COULEURS_NOMS_REFERENCE, customCouleurs, value),
    [customCouleurs, value],
  );

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return allNoms.slice(0, MAX_BROWSE);
    return allNoms.filter((o) => o.toLowerCase().includes(q)).slice(0, MAX_FILTERED);
  }, [allNoms, searchQ]);

  const trimmedSearch = searchQ.trim();
  const exactMatch = useMemo(
    () => allNoms.some((o) => o.toLowerCase() === trimmedSearch.toLowerCase()),
    [allNoms, trimmedSearch],
  );
  const showAddRow = trimmedSearch.length > 0 && !exactMatch;

  const currentHex = resolveDisplayHex(value, extrasMap);

  const closeAll = useCallback(() => {
    setOpen(false);
    setStep('browse');
  }, []);

  const openModal = useCallback(() => {
    setSearchQ('');
    setStep('browse');
    setOpen(true);
  }, []);

  const openPalette = useCallback(
    (nameSeed: string) => {
      const n = nameSeed.trim();
      setPendingName(n);
      const h = n ? resolveDisplayHex(n, extrasMap) : '#64748b';
      setPendingHex(h);
      setHexInput(h);
      setStep('palette');
    },
    [extrasMap],
  );

  const pick = useCallback(
    (nom: string) => {
      const v = nom.trim();
      if (!v) return;
      onChange(v);
      onClearError?.();
      closeAll();
    },
    [closeAll, onChange, onClearError],
  );

  const onAddBanner = useCallback(() => {
    if (!trimmedSearch) return;
    openPalette(trimmedSearch);
  }, [trimmedSearch, openPalette]);

  const onPaletteSave = useCallback(async () => {
    const n = pendingName.trim();
    if (!n) {
      appFeedback.alert('Couleur', 'Indique un nom de couleur (ex. Bleu barré).');
      return;
    }
    const normalized = normalizeHexInput(hexInput) ?? pendingHex;
    const next = await upsertCustomCouleur(n, normalized, customCouleurs);
    setCustomCouleurs(next);
    onChange(n);
    onClearError?.();
    closeAll();
  }, [pendingName, hexInput, pendingHex, customCouleurs, onChange, onClearError, closeAll]);

  const displayLabel = value.trim() ? value.trim() : 'Choisir ou rechercher une couleur…';

  return (
    <View style={styles.wrap}>
      <View style={[styles.trigger, error && styles.triggerErr]}>
        <Pressable
          onPress={() => {
            if (!value.trim()) {
              setOpen(true);
              setSearchQ('');
              setStep('palette');
              setPendingName('');
              setPendingHex('#64748b');
              setHexInput('#64748b');
              return;
            }
            setSearchQ('');
            setStep('browse');
            setOpen(true);
            openPalette(value);
          }}
          style={styles.triggerLeft}
          accessibilityLabel="Ouvrir le nuancier pour la teinte d’aperçu"
          accessibilityRole="button"
        >
          <Swatch hex={currentHex} size={24} />
          <Pipette size={18} color={theme.teal700} />
        </Pressable>
        <Pressable
          onPress={openModal}
          style={styles.triggerCenter}
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le choix de couleur"
        >
          <Text style={[styles.triggerTxt, !value.trim() && styles.triggerPlaceholder]} numberOfLines={2}>
            {displayLabel}
          </Text>
        </Pressable>
        <Pressable onPress={openModal} accessibilityLabel="Ouvrir la liste" hitSlop={8}>
          <ChevronDown size={22} color={theme.slate500} />
        </Pressable>
      </View>
      <Text style={styles.hint}>
        Liste indicative : recherche, choix avec aperçu, ou ajout d’une couleur + teinte (pastilles / code hex).
      </Text>
      {error ? <Text style={styles.errTxt}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={closeAll}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeAll} accessibilityLabel="Fermer" />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            style={styles.sheetOuter}
          >
            <View style={styles.sheet}>
              {step === 'browse' ? (
                <>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Couleur</Text>
                    <View style={styles.headerActions}>
                      {value.trim() ? (
                        <Pressable
                          onPress={() => openPalette(value)}
                          hitSlop={8}
                          style={styles.iconBtn}
                          accessibilityLabel="Nuancier"
                        >
                          <Pipette size={22} color={theme.teal700} />
                        </Pressable>
                      ) : null}
                      <Pressable onPress={closeAll} hitSlop={12} accessibilityLabel="Fermer">
                        <X size={24} color={theme.slate600} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.searchRow}>
                    <Search size={18} color={theme.slate500} style={styles.searchIcon} />
                    <TextInput
                      style={styles.searchInp}
                      value={searchQ}
                      onChangeText={setSearchQ}
                      placeholder="Filtrer ou saisir un nom…"
                      placeholderTextColor={theme.slate500}
                      autoCorrect={false}
                      autoCapitalize="sentences"
                      clearButtonMode="while-editing"
                    />
                  </View>

                  {showAddRow ? (
                    <Pressable style={styles.addBanner} onPress={onAddBanner} accessibilityRole="button">
                      <Plus size={20} color={theme.teal800} />
                      <Text style={styles.addBannerTxt}>Ajouter « {trimmedSearch} »… (teinte d’aperçu)</Text>
                    </Pressable>
                  ) : null}

                  <FlatList
                    data={filtered}
                    keyExtractor={(item) => item}
                    keyboardShouldPersistTaps="handled"
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                      <Pressable style={styles.row} onPress={() => pick(item)} accessibilityRole="button">
                        <Text style={styles.rowTxt} numberOfLines={2}>
                          {item}
                        </Text>
                        <Swatch hex={resolveDisplayHex(item, extrasMap)} size={20} />
                      </Pressable>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.empty}>
                        {trimmedSearch
                          ? 'Aucune couleur ne correspond. Utilise le bouton d’ajout ci-dessus.'
                          : 'Aucune entrée.'}
                      </Text>
                    }
                  />
                </>
              ) : (
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.paletteScroll}>
                  <View style={styles.sheetHeader}>
                    <Pressable
                      onPress={() => setStep('browse')}
                      hitSlop={12}
                      style={styles.backBtn}
                      accessibilityLabel="Retour à la liste"
                    >
                      <ChevronLeft size={26} color={theme.slate800} />
                    </Pressable>
                    <Text style={[styles.sheetTitle, styles.sheetTitleFlex]}>Teinte d’aperçu</Text>
                    <Pressable onPress={closeAll} hitSlop={12}>
                      <X size={24} color={theme.slate600} />
                    </Pressable>
                  </View>
                  <Text style={styles.paletteLead}>
                    Le nom décrit la robe ; la teinte sert uniquement à l’aperçu sur cet appareil (comme sur le web).
                  </Text>

                  <Text style={styles.fieldLab}>Nom de la couleur</Text>
                  <TextInput
                    style={styles.inp}
                    value={pendingName}
                    onChangeText={setPendingName}
                    placeholder="Ex. Bleu barré"
                    placeholderTextColor={theme.slate500}
                  />

                  <Text style={[styles.fieldLab, { marginTop: 14 }]}>Pastilles rapides</Text>
                  <View style={styles.presetGrid}>
                    {COULEUR_PRESETS.map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => {
                          setPendingHex(h);
                          setHexInput(h);
                        }}
                        style={[
                          styles.presetCell,
                          pendingHex.toLowerCase() === h.toLowerCase() && styles.presetCellOn,
                          { backgroundColor: h },
                        ]}
                        accessibilityLabel={`Teinte ${h}`}
                      />
                    ))}
                  </View>

                  <Text style={[styles.fieldLab, { marginTop: 14 }]}>Code hex (#RRVVAA)</Text>
                  <TextInput
                    style={styles.inp}
                    value={hexInput}
                    onChangeText={(t) => {
                      setHexInput(t);
                      const n = normalizeHexInput(t);
                      if (n) setPendingHex(n);
                    }}
                    placeholder="#64748b"
                    placeholderTextColor={theme.slate500}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.monoHint}>{pendingHex}</Text>

                  <View style={styles.paletteActions}>
                    <Pressable style={styles.btnGhost} onPress={() => setStep('browse')}>
                      <Text style={styles.btnGhostTxt}>Retour</Text>
                    </Pressable>
                    <Pressable style={styles.btnPrimary} onPress={() => void onPaletteSave()}>
                      <Text style={styles.btnPrimaryTxt}>Enregistrer</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: theme.white,
    minHeight: 48,
  },
  triggerErr: { borderColor: theme.red600 },
  triggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingRight: 4 },
  triggerCenter: { flex: 1, minWidth: 0, paddingVertical: 4 },
  triggerTxt: { fontSize: 16, fontWeight: '600', color: theme.slate900 },
  triggerPlaceholder: { color: theme.slate500, fontWeight: '500' },
  swatch: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  hint: { fontSize: 12, color: theme.slate500, marginTop: 6, lineHeight: 16 },
  errTxt: { color: theme.red600, fontSize: 12, marginTop: 4 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheetOuter: { width: '100%' },
  sheet: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    gap: 8,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  iconBtn: { padding: 6 },
  backBtn: { padding: 4, marginRight: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: theme.slate900 },
  sheetTitleFlex: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.slate50,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 4 },
  searchInp: {
    flex: 1,
    fontSize: 16,
    color: theme.slate900,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  addBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.teal50,
    borderWidth: 1,
    borderColor: theme.teal100,
  },
  addBannerTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.teal900 },
  list: { maxHeight: 380 },
  listContent: { paddingHorizontal: 8, paddingBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 6,
    marginVertical: 2,
  },
  rowTxt: { flex: 1, fontSize: 15, color: theme.slate800, lineHeight: 21 },
  empty: { textAlign: 'center', color: theme.slate500, padding: 24, fontSize: 14 },
  paletteScroll: { paddingHorizontal: 16, paddingBottom: 24 },
  paletteLead: {
    fontSize: 12,
    color: theme.slate600,
    lineHeight: 17,
    marginBottom: 12,
    marginTop: 4,
  },
  fieldLab: { fontSize: 13, fontWeight: '700', color: theme.slate800, marginBottom: 6 },
  inp: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    backgroundColor: theme.white,
    color: theme.slate900,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  presetCell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.15)',
  },
  presetCellOn: {
    borderWidth: 2,
    borderColor: theme.teal600,
  },
  monoHint: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: theme.slate500,
    marginTop: 6,
  },
  paletteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  btnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnGhostTxt: { fontWeight: '700', color: theme.slate700 },
  btnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: theme.teal600,
  },
  btnPrimaryTxt: { fontWeight: '800', color: theme.white },
});
