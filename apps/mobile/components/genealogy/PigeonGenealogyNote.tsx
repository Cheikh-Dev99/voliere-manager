import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FileText, X } from 'lucide-react-native';

import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { AnimatedPressable } from '../ui/AnimatedPressable';

type Accent = 'neutral' | 'male' | 'female';

type Props = {
  label: string;
  notes: string;
  accent?: Accent;
};

function createStyles(theme: ThemeColors) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: theme.radiusMd,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 8,
    },
    chipNeutral: {
      borderColor: theme.border,
      backgroundColor: theme.surfaceHighlight,
    },
    chipMale: {
      borderColor: '#7dd3fc',
      backgroundColor: 'rgba(224, 242, 254, 0.65)',
    },
    chipFemale: {
      borderColor: '#f9a8d4',
      backgroundColor: 'rgba(255, 228, 230, 0.65)',
    },
    chipIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceElevated,
    },
    chipBody: { flex: 1, minWidth: 0 },
    chipK: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: theme.slate500,
    },
    chipPreview: { marginTop: 2, fontSize: 12, color: theme.slate700, lineHeight: 17 },
    chipAction: { fontSize: 12, fontWeight: '700', color: theme.teal700 },
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
    sheet: {
      backgroundColor: theme.surfaceElevated,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 28,
      maxHeight: '78%',
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      paddingBottom: 12,
    },
    sheetTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: theme.slate900 },
    sheetSub: { marginTop: 4, fontSize: 12, color: theme.slate500 },
    sheetBody: { paddingTop: 14, paddingBottom: 8 },
    sheetTxt: { fontSize: 15, lineHeight: 22, color: theme.slate800 },
    closeBtn: {
      marginTop: 12,
      alignSelf: 'flex-end',
      backgroundColor: theme.teal600,
      borderRadius: theme.radiusMd,
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    closeBtnTxt: { color: theme.white, fontWeight: '800', fontSize: 15 },
  });
}

export function PigeonGenealogyNote({ label, notes, accent = 'neutral' }: Props) {
  const text = (notes ?? '').trim();
  const [open, setOpen] = useState(false);
  const { colors: theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!text) return null;

  const preview = text.length > 72 ? `${text.slice(0, 72)}…` : text;
  const chipStyle =
    accent === 'male' ? styles.chipMale : accent === 'female' ? styles.chipFemale : styles.chipNeutral;

  return (
    <>
      <AnimatedPressable
        onPress={() => setOpen(true)}
        style={[styles.chip, chipStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Lire la note : ${label}`}
      >
        <View style={styles.chipIconWrap}>
          <FileText size={18} color={theme.teal700} />
        </View>
        <View style={styles.chipBody}>
          <Text style={styles.chipK}>{label}</Text>
          <Text style={styles.chipPreview} numberOfLines={2}>
            {preview}
          </Text>
        </View>
        <Text style={styles.chipAction}>Lire</Text>
      </AnimatedPressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Fermer" />
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{label}</Text>
                <Text style={styles.sheetSub}>Fiche pigeon · visible aussi sur la fiche détail</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityLabel="Fermer">
                <X size={22} color={theme.slate600} />
              </Pressable>
            </View>
            <View style={styles.sheetBody}>
              <Text style={styles.sheetTxt}>{text}</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeBtnTxt}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
