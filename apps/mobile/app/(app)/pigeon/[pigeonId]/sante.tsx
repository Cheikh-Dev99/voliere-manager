import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GitBranch, Stethoscope } from 'lucide-react-native';

import { usePigeonHealthHistory } from '@shared/hooks/usePigeonHealthHistory';
import { ajouterEvenementSante } from '@shared/services/pigeonHealthService';
import { obtenirPigeon } from '@shared/services/pigeonsService';
import type { Pigeon } from '@shared/types';

import { PigeonPhotoAvatar } from '../../../../components/pigeons/PigeonPhotoAvatar';
import { EmptyStateCard } from '../../../../components/layout/EmptyStateCard';
import { HealthEventDatePicker } from '../../../../components/forms/HealthEventDatePicker';
import { AppLoadingView } from '../../../../components/ui/AppLoadingView';
import { theme, shadowCard } from '../../../../constants/theme';
import { appFeedback } from '../../../../lib/appFeedback';
import { formatFirestoreDate } from '../../../../utils/formatDate';

function normalizePigeonId(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function PigeonSanteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pigeonId: string | string[] }>();
  const pigeonId = useMemo(() => normalizePigeonId(params.pigeonId), [params.pigeonId]);

  const [pigeon, setPigeon] = useState<Pigeon | null>(null);
  const [pigeonLoading, setPigeonLoading] = useState(true);
  const [pigeonError, setPigeonError] = useState<string | null>(null);

  const [summary, setSummary] = useState('');
  const [detail, setDetail] = useState('');
  const [occDate, setOccDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const pigeonIds = useMemo(() => (pigeon?.id ? [pigeon.id] : []), [pigeon?.id]);
  const { mergedSorted, loading: eventsLoading, error: eventsError } = usePigeonHealthHistory(pigeonIds);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pigeonId) {
        setPigeon(null);
        setPigeonError('Identifiant pigeon manquant.');
        setPigeonLoading(false);
        return;
      }
      setPigeonLoading(true);
      setPigeonError(null);
      try {
        const p = await obtenirPigeon(pigeonId);
        if (!alive) return;
        if (!p) {
          setPigeon(null);
          setPigeonError('Pigeon introuvable.');
          return;
        }
        setPigeon(p);
      } catch (e) {
        if (alive) setPigeonError(e instanceof Error ? e.message : 'Impossible de charger le pigeon');
      } finally {
        if (alive) setPigeonLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [pigeonId]);

  const onSave = useCallback(async () => {
    const s = summary.trim();
    if (!s) {
      appFeedback.error('Résumé obligatoire', 'Indique un court libellé (ex. vermifuge, consultation).');
      return;
    }
    if (!pigeonId) return;
    if (!DATE_RE.test(occDate.trim())) {
      appFeedback.error('Date invalide', 'Utilise le format AAAA-MM-JJ (ex. 2026-05-13).');
      return;
    }
    setSaving(true);
    try {
      await ajouterEvenementSante(pigeonId, {
        summary: s,
        detail: detail.trim(),
        occurredAt: new Date(`${occDate.trim()}T12:00:00`),
      });
      setSummary('');
      setDetail('');
      setOccDate(new Date().toISOString().slice(0, 10));
      appFeedback.success('Entrée enregistrée', 'Le carnet de santé a été mis à jour.');
    } catch (e) {
      appFeedback.error('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }, [summary, detail, occDate, pigeonId]);

  if (pigeonLoading) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="default"
          message="Chargement du pigeon…"
          subtitle="Carnet de santé."
        />
      </View>
    );
  }

  if (pigeonError || !pigeon) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{pigeonError ?? 'Pigeon introuvable.'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Text style={styles.backTxt}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <PigeonPhotoAvatar pigeon={pigeon} size="md" />
            <View style={styles.heroText}>
              <View style={styles.heroTitleRow}>
                <Stethoscope size={20} color={theme.teal700} strokeWidth={2.2} />
                <Text style={styles.heroTitle}>Carnet de santé</Text>
              </View>
              <Text style={styles.mat}>{pigeon.matricule}</Text>
              <Text style={styles.sub}>
                {pigeon.nom} · {pigeon.race}
              </Text>
            </View>
          </View>
          <Text style={styles.intro}>
            Consultations, traitements et observations liés à ce pigeon. Les entrées restent sur sa fiche, quelle que soit
            la cage.
          </Text>
          <View style={styles.heroActions}>
            <Pressable
              onPress={() => router.push(`/(app)/pigeon/${pigeon.id}`)}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Retour à la fiche pigeon"
            >
              <Text style={styles.linkBtnTxt}>Fiche pigeon</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/(app)/pigeon/${pigeon.id}/genealogie`)}
              style={({ pressed }) => [styles.linkBtnOutline, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir la généalogie"
            >
              <GitBranch size={16} color={theme.teal800} strokeWidth={2.2} />
              <Text style={styles.linkBtnOutlineTxt}>Généalogie</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Nouvelle entrée</Text>
          <Text style={styles.lab}>Date de l&apos;événement</Text>
          <HealthEventDatePicker value={occDate} onChange={setOccDate} />
          <Text style={styles.lab}>Résumé (obligatoire)</Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="Ex. Vermifuge, consultation…"
            placeholderTextColor={theme.slate500}
            style={styles.input}
            accessibilityLabel="Résumé de l'événement"
          />
          <Text style={styles.lab}>Détail (optionnel)</Text>
          <TextInput
            value={detail}
            onChangeText={setDetail}
            placeholder="Dosage, symptômes, notes…"
            placeholderTextColor={theme.slate500}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textarea]}
            accessibilityLabel="Détail de l'événement"
          />
          <Pressable
            onPress={() => void onSave()}
            disabled={saving || !summary.trim()}
            style={({ pressed }) => [
              styles.submit,
              (saving || !summary.trim()) && styles.submitDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving || !summary.trim() }}
          >
            <Text style={styles.submitTxt}>{saving ? 'Enregistrement…' : 'Ajouter au carnet'}</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTit}>Historique</Text>
        {eventsError ? <Text style={styles.errBox}>{eventsError}</Text> : null}
        {eventsLoading ? (
          <View style={styles.eventsLoading}>
            <AppLoadingView
              variant="inline"
              loadingContext="default"
              message="Chargement de l'historique…"
              style={{ alignSelf: 'center' }}
            />
          </View>
        ) : mergedSorted.length === 0 ? (
          <EmptyStateCard
            icon={<Stethoscope size={28} color={theme.teal700} strokeWidth={2.2} />}
            title="Aucune entrée pour l’instant"
            hint="Utilise le formulaire ci-dessus pour enregistrer une consultation, un soin ou une observation."
          />
        ) : (
          mergedSorted.map((item) => (
            <View key={item.id} style={styles.evCard}>
              <Text style={styles.evDate}>{formatFirestoreDate(item.occurredAt)}</Text>
              <Text style={styles.evSum}>{item.summary}</Text>
              {item.detail?.trim() ? <Text style={styles.evDet}>{item.detail.trim()}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: theme.screenPadding, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'transparent' },
  err: { color: theme.red600, textAlign: 'center', fontSize: 15, marginBottom: 16 },
  errBox: {
    backgroundColor: '#fef2f2',
    borderRadius: theme.radiusMd,
    padding: 12,
    color: theme.red600,
    fontSize: 13,
    marginBottom: 12,
  },
  backBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  backTxt: { color: theme.teal700, fontWeight: '700', fontSize: 16 },
  hero: { marginBottom: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroText: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: theme.slate900, letterSpacing: -0.3, flex: 1, minWidth: 0 },
  mat: { marginTop: 4, fontSize: 15, fontWeight: '700', color: theme.teal900, fontVariant: ['tabular-nums'] },
  sub: { marginTop: 2, fontSize: 14, color: theme.slate600 },
  intro: { marginTop: 12, fontSize: 14, lineHeight: 21, color: theme.slate600 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  linkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.teal600,
  },
  linkBtnTxt: { color: theme.white, fontWeight: '700', fontSize: 14 },
  linkBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.teal100,
    backgroundColor: theme.white,
  },
  linkBtnOutlineTxt: { color: theme.teal800, fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.88 },
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 20,
    ...shadowCard,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: theme.slate900, marginBottom: 14 },
  lab: { fontSize: 12, fontWeight: '600', color: theme.slate600, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.slate900,
    marginBottom: 14,
    backgroundColor: theme.white,
  },
  textarea: { minHeight: 96, paddingTop: 10 },
  submit: {
    marginTop: 4,
    minHeight: theme.minTap,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.teal600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.45 },
  submitTxt: { color: theme.white, fontWeight: '800', fontSize: 16 },
  sectionTit: { fontSize: 15, fontWeight: '800', color: theme.slate800, marginBottom: 10 },
  eventsLoading: { paddingVertical: 24, alignItems: 'center' },
  evCard: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 10,
    ...shadowCard,
  },
  evDate: { fontSize: 12, fontWeight: '700', color: theme.teal800 },
  evSum: { fontSize: 16, fontWeight: '800', color: theme.slate900, marginTop: 4 },
  evDet: { fontSize: 14, color: theme.slate600, marginTop: 6, lineHeight: 20 },
});
