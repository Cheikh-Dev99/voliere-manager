import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';

type Props = {
  value: string;
  onChange: (isoYmd: string) => void;
  error?: string;
  onClearError?: () => void;
};

const MIN = new Date(1900, 0, 1);

function parseYmd(s: string): Date {
  const t = s?.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const [y, m, d] = t.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return Number.isNaN(dt.getTime()) ? new Date() : dt;
  }
  return new Date();
}

function toIsoYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatFrLong(isoYmd: string): string {
  const t = isoYmd?.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  const d = parseYmd(t);
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return t;
  }
}

export function PigeonBirthDatePicker({ value, onChange, error, onClearError }: Props) {
  const { colors: c, resolved } = useAppTheme();
  const styles = useMemo(() => createBirthDateStyles(c), [c]);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosTemp, setIosTemp] = useState(() => parseYmd(value));

  const maxDate = useMemo(() => new Date(), []);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        <TextInput
          style={[styles.webInp, error && styles.triggerErr]}
          value={value}
          onChangeText={(t) => {
            onChange(t);
            onClearError?.();
          }}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={c.slate500}
        />
        <Text style={styles.hint}>Sur le web Expo, saisis la date au format AAAA-MM-JJ.</Text>
        {error ? <Text style={styles.errTxt}>{error}</Text> : null}
      </View>
    );
  }

  const applyDate = useCallback(
    (d: Date) => {
      onChange(toIsoYmd(d));
      onClearError?.();
    },
    [onChange, onClearError],
  );

  const openPicker = useCallback(() => {
    const current = parseYmd(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate: MIN,
        maximumDate: maxDate,
        onChange: (e, date) => {
          if (e.type === 'set' && date) applyDate(date);
        },
      });
      return;
    }
    setIosTemp(current);
    setIosOpen(true);
  }, [value, maxDate, applyDate]);

  const displayLine = value.trim() && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? formatFrLong(value.trim())
    : 'Choisir la date de naissance';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={openPicker}
        style={[styles.trigger, error && styles.triggerErr]}
        accessibilityRole="button"
        accessibilityLabel="Choisir la date de naissance"
      >
        <Calendar size={20} color={c.teal700} />
        <View style={styles.triggerTextCol}>
          <Text style={[styles.triggerMain, !value.trim() && styles.triggerPlaceholder]} numberOfLines={2}>
            {displayLine}
          </Text>
          {value.trim() && /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? (
            <Text style={styles.triggerSub}>({value.trim()})</Text>
          ) : null}
        </View>
      </Pressable>
      <Text style={styles.hint}>Stockée au format AAAA-MM-JJ dans la fiche.</Text>
      {error ? <Text style={styles.errTxt}>{error}</Text> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} animationType="slide" transparent onRequestClose={() => setIosOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)} />
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Date de naissance</Text>
              <DateTimePicker
                value={iosTemp}
                mode="date"
                display="spinner"
                locale="fr_FR"
                minimumDate={MIN}
                maximumDate={maxDate}
                onChange={(_, date) => {
                  if (date) setIosTemp(date);
                }}
                themeVariant={resolved === 'dark' ? 'dark' : 'light'}
              />
              <View style={styles.sheetActions}>
                <Pressable style={styles.btnGhost} onPress={() => setIosOpen(false)}>
                  <Text style={styles.btnGhostTxt}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={styles.btnPrimary}
                  onPress={() => {
                    applyDate(iosTemp);
                    setIosOpen(false);
                  }}
                >
                  <Text style={styles.btnPrimaryTxt}>OK</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function createBirthDateStyles(theme: ThemeColors) {
  return StyleSheet.create({
  wrap: {},
  webInp: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: theme.surfaceElevated,
    color: theme.slate900,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: theme.surfaceElevated,
    minHeight: 52,
  },
  triggerErr: { borderColor: theme.red600 },
  triggerTextCol: { flex: 1, minWidth: 0 },
  triggerMain: { fontSize: 16, fontWeight: '600', color: theme.slate900 },
  triggerPlaceholder: { color: theme.slate500, fontWeight: '500' },
  triggerSub: { fontSize: 12, color: theme.slate500, marginTop: 4, fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12, color: theme.slate500, marginTop: 6 },
  errTxt: { color: theme.red600, fontSize: 12, marginTop: 4 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: theme.surfaceElevated,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: theme.slate900, marginBottom: 8, textAlign: 'center' },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  btnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnGhostTxt: { fontWeight: '700', color: theme.slate700 },
  btnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: theme.teal600,
  },
  btnPrimaryTxt: { fontWeight: '800', color: theme.white },
  });
}
