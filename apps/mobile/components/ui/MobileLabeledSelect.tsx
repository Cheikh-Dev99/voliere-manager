import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, X } from 'lucide-react-native';

import { theme } from '../../constants/theme';

export type MobileSelectOption = { value: string; label: string };

type Props = {
  label: string;
  options: MobileSelectOption[];
  value: string;
  onChange: (value: string) => void;
  containerStyle?: ViewStyle;
  accessibilityHint?: string;
};

export function MobileLabeledSelect({
  label,
  options,
  value,
  onChange,
  containerStyle,
  accessibilityHint,
}: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    return options.find((o) => o.value === value)?.label ?? value;
  }, [options, value]);

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={styles.lab}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint ?? `Valeur : ${displayLabel}. Ouvre la liste.`}
      >
        <Text style={styles.triggerTxt} numberOfLines={1}>
          {displayLabel}
        </Text>
        <ChevronDown size={20} color={theme.slate500} strokeWidth={2.2} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityLabel="Fermer"
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel="Fermer">
                <X size={22} color={theme.slate600} strokeWidth={2.2} />
              </Pressable>
            </View>
            {options.map((opt) => {
              const sel = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.row, sel && styles.rowOn]}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                >
                  <Text style={[styles.rowTxt, sel && styles.rowTxtOn]} numberOfLines={2}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: 0 },
  lab: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.slate800,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: theme.white,
    minHeight: 44,
  },
  triggerTxt: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.slate900,
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: '55%',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: theme.slate900 },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: theme.radiusMd,
  },
  rowOn: { backgroundColor: theme.teal50 },
  rowTxt: { fontSize: 16, fontWeight: '600', color: theme.slate800 },
  rowTxtOn: { color: theme.teal900, fontWeight: '700' },
});
