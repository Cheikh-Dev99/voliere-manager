import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, Plus, Search, X } from 'lucide-react-native';

import { PIGEON_RACES_REFERENCE } from '@shared/data/pigeonFormCatalog';

import { theme } from '../../constants/theme';
import { mergeRacesCatalog, persistNewCustomRace, readCustomRaces } from '../../utils/pigeonCustomRacesStorage';

type Props = {
  value: string;
  onChange: (race: string) => void;
  error?: string;
  onClearError?: () => void;
};

const MAX_BROWSE = 100;
const MAX_FILTERED = 150;

export function PigeonRacePicker({ value, onChange, error, onClearError }: Props) {
  const [open, setOpen] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [customRaces, setCustomRaces] = useState<string[]>([]);

  const loadCustom = useCallback(async () => {
    const list = await readCustomRaces();
    setCustomRaces(list);
  }, []);

  useEffect(() => {
    void loadCustom();
  }, [loadCustom]);

  const allRaces = useMemo(
    () => mergeRacesCatalog(PIGEON_RACES_REFERENCE, customRaces, value),
    [customRaces, value],
  );

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return allRaces.slice(0, MAX_BROWSE);
    return allRaces.filter((o) => o.toLowerCase().includes(q)).slice(0, MAX_FILTERED);
  }, [allRaces, searchQ]);

  const trimmedSearch = searchQ.trim();
  const exactMatch = useMemo(
    () => allRaces.some((o) => o.toLowerCase() === trimmedSearch.toLowerCase()),
    [allRaces, trimmedSearch],
  );
  const showAddRow = trimmedSearch.length > 0 && !exactMatch;

  const openModal = useCallback(() => {
    setSearchQ(value.trim());
    setOpen(true);
  }, [value]);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  const pick = useCallback(
    (race: string) => {
      const v = race.trim();
      if (!v) return;
      onChange(v);
      onClearError?.();
      closeModal();
    },
    [closeModal, onChange, onClearError],
  );

  const onAddCustom = useCallback(async () => {
    if (!trimmedSearch) return;
    const next = await persistNewCustomRace(trimmedSearch, customRaces);
    setCustomRaces(next);
    pick(trimmedSearch);
  }, [trimmedSearch, customRaces, pick]);

  const displayLabel = value.trim() ? value.trim() : 'Choisir ou rechercher une race…';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={openModal}
        style={[styles.trigger, error && styles.triggerErr]}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir le choix de race"
        accessibilityHint="Recherche dans le catalogue, ou ajout d’une race personnalisée"
      >
        <Text style={[styles.triggerTxt, !value.trim() && styles.triggerPlaceholder]} numberOfLines={2}>
          {displayLabel}
        </Text>
        <ChevronDown size={22} color={theme.slate500} />
      </Pressable>
      <Text style={styles.hint}>Liste indicative : recherche, choix dans la liste ou ajout d’une race.</Text>
      {error ? <Text style={styles.errTxt}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} accessibilityLabel="Fermer" />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            style={styles.sheetOuter}
          >
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Race</Text>
                <Pressable onPress={closeModal} hitSlop={12} accessibilityLabel="Fermer">
                  <X size={24} color={theme.slate600} />
                </Pressable>
              </View>

              <View style={styles.searchRow}>
                <Search size={18} color={theme.slate500} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInp}
                  value={searchQ}
                  onChangeText={setSearchQ}
                  placeholder="Filtrer ou saisir une race…"
                  placeholderTextColor={theme.slate500}
                  autoCorrect={false}
                  autoCapitalize="sentences"
                  clearButtonMode="while-editing"
                />
              </View>

              {showAddRow ? (
                <Pressable style={styles.addBanner} onPress={() => void onAddCustom()} accessibilityRole="button">
                  <Plus size={20} color={theme.teal800} />
                  <Text style={styles.addBannerTxt}>Ajouter « {trimmedSearch} » à mes races</Text>
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
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {trimmedSearch
                      ? 'Aucune race ne correspond. Utilise le bouton d’ajout ci-dessus.'
                      : 'Aucune entrée.'}
                  </Text>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 0 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    backgroundColor: theme.white,
    minHeight: 48,
  },
  triggerErr: { borderColor: theme.red600 },
  triggerTxt: { flex: 1, fontSize: 16, fontWeight: '600', color: theme.slate900 },
  triggerPlaceholder: { color: theme.slate500, fontWeight: '500' },
  hint: { fontSize: 12, color: theme.slate500, marginTop: 6, lineHeight: 16 },
  errTxt: { color: theme.red600, fontSize: 12, marginTop: 4 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheetOuter: { width: '100%' },
  sheet: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: theme.slate900 },
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
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 6,
    marginVertical: 2,
  },
  rowTxt: { fontSize: 15, color: theme.slate800, lineHeight: 21 },
  empty: { textAlign: 'center', color: theme.slate500, padding: 24, fontSize: 14 },
});
