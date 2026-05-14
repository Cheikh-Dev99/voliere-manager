import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Info, Plus, Trash2 } from 'lucide-react-native';

import { updateUserProfile } from '@shared/services/usersProfileService';
import type { Cage, UserProfile } from '@shared/types';
import {
  mergeProfileVoliereCodesWithCages,
  normalizeVoliereCodeInput,
  isVoliereCodeUsedByCages,
  VOLIERE_CODE_MAX_LEN,
} from '@shared/utils/voliereCodesMerge';

import { shadowCard, theme } from '../../constants/theme';

function appendCodeIfNew(
  pendingRaw: string,
  currentDraft: string[],
): { next: string[]; added: boolean; reason: 'empty' | 'duplicate' | null } {
  const n = normalizeVoliereCodeInput(pendingRaw);
  if (!n) return { next: currentDraft, added: false, reason: 'empty' };
  if (currentDraft.some((c) => c === n)) return { next: currentDraft, added: false, reason: 'duplicate' };
  const next = [...currentDraft, n].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  return { next, added: true, reason: null };
}

type Props = {
  uid: string;
  profile: UserProfile | null;
  cages: Cage[];
};

export function VoliereCodesForm({ uid, profile, cages }: Props) {
  const merged = useMemo(
    () => mergeProfileVoliereCodesWithCages(profile?.voliereCodes, cages),
    [profile?.voliereCodes, cages],
  );

  const [draft, setDraft] = useState(merged);
  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setDraft(merged);
  }, [merged]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const addCode = useCallback(() => {
    const { next, added, reason } = appendCodeIfNew(newCode, draft);
    if (!added) {
      if (reason === 'duplicate') setFeedback({ type: 'err', text: 'Cette volière est déjà dans la liste.' });
      else if ((newCode ?? '').trim())
        setFeedback({
          type: 'err',
          text: `Indique un nom court valide (1 à ${VOLIERE_CODE_MAX_LEN} caractères).`,
        });
      return;
    }
    setDraft(next);
    setNewCode('');
    setFeedback(null);
  }, [draft, newCode]);

  const removeCode = useCallback(
    (code: string) => {
      if (isVoliereCodeUsedByCages(code, cages)) {
        setFeedback({ type: 'err', text: 'Impossible de retirer cette volière : des cages y sont encore rattachées.' });
        return;
      }
      setDraft((d) => d.filter((x) => x !== code));
      setFeedback(null);
    },
    [cages],
  );

  const handleSave = useCallback(async () => {
    const pendingLabel = normalizeVoliereCodeInput(newCode);
    const { next: draftWithPending, added } = appendCodeIfNew(newCode, draft);
    const final = mergeProfileVoliereCodesWithCages(draftWithPending, cages);
    setSaving(true);
    setFeedback(null);
    try {
      await updateUserProfile(uid, { voliereCodes: final });
      setDraft(final);
      setNewCode('');
      setFeedback({
        type: 'ok',
        text:
          added && pendingLabel
            ? `La volière « ${pendingLabel} » est enregistrée.`
            : 'Volières enregistrées.',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Enregistrement impossible';
      setFeedback({ type: 'err', text: msg });
    } finally {
      setSaving(false);
    }
  }, [uid, draft, cages, newCode]);

  return (
    <View style={styles.panel}>
      <View style={styles.infoRow}>
        <Info size={18} color={theme.teal700} style={styles.infoIcon} accessibilityElementsHidden />
        <Text style={styles.infoText}>
          Chaque <Text style={styles.bold}>volière</Text> (bâtiment ou zone) est identifiée par un{' '}
          <Text style={styles.bold}>nom court</Text> (ex. B, Nord). Tu peux les déclarer ici avant de créer des cages ;
          ils apparaissent dans les formulaires avec les volières déjà présentes sur tes cages.
        </Text>
      </View>

      {feedback ? (
        <Text
          style={[styles.feedback, feedback.type === 'ok' ? styles.feedbackOk : styles.feedbackErr]}
          accessibilityLiveRegion="polite"
        >
          {feedback.text}
        </Text>
      ) : null}

      <View style={styles.chipsWrap} accessibilityRole="list">
        {draft.map((code) => {
          const locked = isVoliereCodeUsedByCages(code, cages);
          return (
            <View key={code} style={styles.chip}>
              <Text style={styles.chipLabel}>{code}</Text>
              <Pressable
                onPress={() => removeCode(code)}
                disabled={locked}
                style={({ pressed }) => [styles.chipTrash, pressed && styles.chipTrashPressed, locked && styles.disabled]}
                accessibilityLabel={locked ? `Volière ${code}, verrouillée` : `Retirer la volière ${code}`}
                accessibilityState={{ disabled: locked }}
                hitSlop={8}
              >
                <Trash2 size={16} color={locked ? theme.slate500 : theme.slate600} />
              </Pressable>
            </View>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>Nom court de la nouvelle volière</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={newCode}
          onChangeText={setNewCode}
          placeholder="Ex. B, Nord…"
          placeholderTextColor={theme.slate500}
          maxLength={VOLIERE_CODE_MAX_LEN}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          onSubmitEditing={addCode}
          returnKeyType="done"
          style={styles.input}
          accessibilityLabel="Nom court de la nouvelle volière"
        />
        <Pressable
          onPress={addCode}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Ajouter la volière à la liste"
        >
          <Plus size={18} color={theme.teal800} />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Saisis le nom court puis « Enregistrer les volières » pour tout sauver d’un coup, ou utilise « Ajouter » /
        Entrée pour voir la pastille apparaître avant.
      </Text>

      <Pressable
        onPress={() => void handleSave()}
        disabled={saving}
        style={({ pressed }) => [styles.saveBtn, pressed && !saving && styles.saveBtnPressed, saving && styles.saveBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Enregistrer les volières"
      >
        {saving ? <ActivityIndicator color={theme.white} /> : null}
        <Text style={styles.saveBtnText}>{saving ? 'Enregistrement…' : 'Enregistrer les volières'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.teal100,
    backgroundColor: 'rgba(240, 253, 250, 0.65)',
    padding: theme.screenPadding,
    ...shadowCard,
  },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoIcon: { marginTop: 2 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20, color: theme.teal900 },
  bold: { fontWeight: '700' },
  feedback: { marginTop: 10, fontSize: 13, lineHeight: 18 },
  feedbackOk: { color: theme.emerald900 },
  feedbackErr: { color: theme.red600 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.slate200,
    backgroundColor: theme.white,
    ...shadowCard,
  },
  chipLabel: { fontSize: 15, fontWeight: '700', color: theme.slate800 },
  chipTrash: { padding: 6, borderRadius: 8 },
  chipTrashPressed: { backgroundColor: theme.rose50 },
  disabled: { opacity: 0.45 },
  fieldLabel: { marginTop: 16, marginBottom: 6, fontSize: 12, fontWeight: '600', color: theme.slate600 },
  inputRow: { flexDirection: 'column', gap: 10 },
  input: {
    minHeight: theme.minTap,
    borderWidth: 1,
    borderColor: theme.slate200,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 14,
    fontSize: 16,
    color: theme.slate900,
    backgroundColor: theme.white,
  },
  addBtn: {
    minHeight: theme.minTap,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.teal600,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.white,
    paddingHorizontal: 16,
  },
  addBtnPressed: { backgroundColor: theme.teal50 },
  addBtnText: { fontSize: 15, fontWeight: '600', color: theme.teal800 },
  hint: { marginTop: 10, fontSize: 11, lineHeight: 16, color: theme.slate600 },
  saveBtn: {
    marginTop: 14,
    minHeight: theme.minTap + 2,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.teal600,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveBtnPressed: { backgroundColor: theme.teal700 },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: theme.white },
});
