import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, CheckCircle2, HelpCircle, Info, X } from 'lucide-react-native';

import { registerAppFeedbackHandler } from '../../lib/appFeedbackBus';
import type { FeedbackOpenPayload, FeedbackVariant } from '../../lib/appFeedbackTypes';
import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';

function variantMeta(variant: FeedbackVariant) {
  switch (variant) {
    case 'success':
      return {
        Icon: CheckCircle2,
        iconBg: '#d1fae5',
        iconColor: '#059669',
        accentBorder: '#a7f3d0',
      };
    case 'error':
      return {
        Icon: AlertTriangle,
        iconBg: '#fee2e2',
        iconColor: '#dc2626',
        accentBorder: '#fecaca',
      };
    case 'confirm':
      return {
        Icon: HelpCircle,
        iconBg: '#fef3c7',
        iconColor: '#b45309',
        accentBorder: '#fde68a',
      };
    default:
      return {
        Icon: Info,
        iconBg: '#e0f2fe',
        iconColor: '#0369a1',
        accentBorder: '#bae6fd',
      };
  }
}

export function AppFeedbackProvider({ children }: { children: ReactNode }) {
  const { colors: theme } = useAppTheme();
  const styles = useMemo(() => createFeedbackStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardMax = Math.min(360, width - 32);

  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<FeedbackOpenPayload | null>(null);
  const payloadRef = useRef<FeedbackOpenPayload | null>(null);
  payloadRef.current = payload;

  const show = useCallback((p: FeedbackOpenPayload) => {
    setPayload(p);
    setOpen(true);
  }, []);

  const dismiss = useCallback((fromChrome?: boolean) => {
    if (fromChrome) payloadRef.current?.onDismiss?.();
    setOpen(false);
    setPayload(null);
  }, []);

  useEffect(() => {
    registerAppFeedbackHandler(show);
    return () => registerAppFeedbackHandler(null);
  }, [show]);

  const meta = useMemo(() => (payload ? variantMeta(payload.variant) : null), [payload]);
  const IconCmp = meta?.Icon ?? Info;

  return (
    <>
      {children}
      <Modal
        visible={open && Boolean(payload)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => dismiss(true)}
        accessibilityViewIsModal
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            const p = payloadRef.current;
            if (p?.variant === 'confirm' && p.buttons.length > 1) return;
            dismiss(true);
          }}
          accessibilityLabel="Fermer"
        >
          <Pressable
            style={[
              styles.card,
              { maxWidth: cardMax, borderTopColor: meta?.accentBorder ?? theme.border },
              { marginBottom: Math.max(insets.bottom, 16) },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.cardInner}>
              <View style={styles.headRow}>
                <View style={[styles.iconWrap, { backgroundColor: meta?.iconBg ?? theme.slate100 }]}>
                  <IconCmp size={28} color={meta?.iconColor ?? theme.slate700} strokeWidth={2.2} />
                </View>
                <Pressable
                  onPress={() => dismiss(true)}
                  hitSlop={12}
                  style={styles.closeGhost}
                  accessibilityLabel="Fermer"
                  accessibilityRole="button"
                >
                  <X size={22} color={theme.slate500} strokeWidth={2.2} />
                </Pressable>
              </View>

              <Text style={styles.title} accessibilityRole="header">
                {payload?.title}
              </Text>
              {payload?.message ? (
                <Text style={styles.message} accessibilityLiveRegion="polite">
                  {payload.message}
                </Text>
              ) : null}

              <View style={styles.btnCol}>
                {payload?.buttons.map((b, i) => (
                  <Pressable
                    key={`${b.text}-${i}`}
                    onPress={() => {
                      try {
                        b.onPress?.();
                      } finally {
                        dismiss(false);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.btn,
                      b.style === 'destructive' && styles.btnDest,
                      b.style === 'cancel' && styles.btnCancel,
                      (!b.style || b.style === 'default') && styles.btnPrimary,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.btnTxt,
                        b.style === 'destructive' && styles.btnTxtDest,
                        b.style === 'cancel' && styles.btnTxtCancel,
                        (!b.style || b.style === 'default') && styles.btnTxtPrimary,
                      ]}
                    >
                      {b.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createFeedbackStyles(theme: ThemeColors) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: theme.surfaceElevated,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    borderTopWidth: 4,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cardInner: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGhost: { padding: 4, marginTop: -4, marginRight: -4 },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: theme.slate900,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  message: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: theme.slate600,
  },
  btnCol: { marginTop: 22, gap: 10 },
  btn: {
    minHeight: theme.minTap,
    borderRadius: theme.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnPrimary: { backgroundColor: theme.teal600 },
  btnCancel: {
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.slate200,
  },
  btnDest: {
    backgroundColor: theme.surfaceElevated,
    borderWidth: 2,
    borderColor: theme.red600,
  },
  btnPressed: { opacity: 0.88 },
  btnTxt: { fontSize: 16, fontWeight: '700' },
  btnTxtPrimary: { color: theme.white },
  btnTxtCancel: { color: theme.slate800 },
  btnTxtDest: { color: theme.red600 },
  });
}
