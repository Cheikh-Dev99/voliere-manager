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
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { IconPressable } from '../ui/IconPressable';

type Props = {
  value: string;
  onChange: (isoYmd: string) => void;
  /** Texte sous le déclencheur (défaut : carnet santé). */
  hint?: string;
  /** Afficher le texte d’aide sous le champ (défaut : true). */
  showHint?: boolean;
  /** Style réduit pour filtres côte à côte (défaut : false). */
  compact?: boolean;
  /** Format d’affichage sur le déclencheur. */
  displayFormat?: 'long' | 'short';
  /** Bouton pour effacer la date (filtres optionnels). */
  allowClear?: boolean;
  /** Titre de la feuille iOS (défaut : date événement). */
  sheetTitle?: string;
  /** Libellé quand aucune date valide (déclencheur). */
  placeholderChoose?: string;
  accessibilityLabel?: string;
};

const DEFAULT_HINT = 'Date du soin, de la consultation ou de l’observation.';
const DEFAULT_SHEET_TITLE = "Date de l'événement";
const DEFAULT_PLACEHOLDER = 'Choisir la date de l’événement';

const MIN = new Date(1900, 0, 1);
const MAX = new Date(2100, 11, 31);

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

function formatFr(isoYmd: string, mode: 'long' | 'short'): string {
  const t = isoYmd?.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  const d = parseYmd(t);
  try {
    if (mode === 'short') {
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    }
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

export function HealthEventDatePicker({
  value,
  onChange,
  hint = DEFAULT_HINT,
  showHint = true,
  compact = false,
  displayFormat = 'long',
  allowClear = false,
  sheetTitle = DEFAULT_SHEET_TITLE,
  accessibilityLabel = "Choisir la date de l'événement",
  placeholderChoose = DEFAULT_PLACEHOLDER,
}: Props) {
  const { colors: c, resolved } = useAppTheme();
  const styles = useMemo(() => createHealthDateStyles(c, compact), [c, compact]);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosTemp, setIosTemp] = useState(() => parseYmd(value));

  const applyDate = useCallback(
    (d: Date) => {
      onChange(toIsoYmd(d));
    },
    [onChange],
  );

  const openPicker = useCallback(() => {
    const current = parseYmd(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate: MIN,
        maximumDate: MAX,
        onChange: (e, date) => {
          if (e.type === 'set' && date) applyDate(date);
        },
      });
      return;
    }
    setIosTemp(current);
    setIosOpen(true);
  }, [value, applyDate]);

  const hasValidDate = value.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  const displayLine = hasValidDate ? formatFr(value.trim(), displayFormat) : placeholderChoose;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        <TextInput
          style={styles.webInp}
          value={value}
          onChangeText={onChange}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={c.slate500}
        />
        {showHint ? (
          <Text style={styles.hint}>Sur le web Expo, saisis la date au format AAAA-MM-JJ.</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.triggerRow}>
      <AnimatedPressable
        onPress={openPicker}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
          <Calendar size={compact ? 18 : 20} color={c.teal700} />
          <View style={styles.triggerTextCol}>
            <Text
              style={[styles.triggerMain, !hasValidDate && styles.triggerPlaceholder]}
              numberOfLines={compact ? 1 : 2}
            >
              {displayLine}
            </Text>
            {hasValidDate && !compact ? (
              <Text style={styles.triggerSub}>({value.trim()})</Text>
            ) : null}
          </View>
        </AnimatedPressable>
        {allowClear && hasValidDate ? (
          <IconPressable
            onPress={() => onChange('')}
            style={styles.clearBtn}
            accessibilityLabel="Effacer la date"
          >
            <Text style={styles.clearBtnTxt}>×</Text>
          </IconPressable>
        ) : null}
      </View>
      {showHint && hint ? <Text style={styles.hint}>{hint}</Text> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} animationType="slide" transparent onRequestClose={() => setIosOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)} />
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{sheetTitle}</Text>
              <DateTimePicker
                value={iosTemp}
                mode="date"
                display="spinner"
                locale="fr_FR"
                minimumDate={MIN}
                maximumDate={MAX}
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

function createHealthDateStyles(theme: ThemeColors, compact: boolean) {
  return StyleSheet.create({
    wrap: { marginBottom: compact ? 0 : 14 },
    triggerRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
    clearBtn: {
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 44,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.radiusMd,
      backgroundColor: theme.surfaceHighlight,
    },
    clearBtnTxt: { fontSize: 22, lineHeight: 24, fontWeight: '600', color: theme.slate600 },
    webInp: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.radiusMd,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      backgroundColor: theme.surfaceElevated,
      color: theme.slate900,
    },
    trigger: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 8 : 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.radiusMd,
      paddingHorizontal: compact ? 10 : 14,
      paddingVertical: compact ? 10 : 14,
      backgroundColor: theme.surfaceHighlight,
      minHeight: compact ? 44 : 52,
    },
    triggerTextCol: { flex: 1, minWidth: 0 },
    triggerMain: { fontSize: 16, fontWeight: '600', color: theme.slate900 },
    triggerPlaceholder: { color: theme.slate500, fontWeight: '500' },
    triggerSub: { fontSize: 12, color: theme.slate500, marginTop: 4, fontVariant: ['tabular-nums'] },
    hint: { fontSize: 12, color: theme.slate500, marginTop: 6 },
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
