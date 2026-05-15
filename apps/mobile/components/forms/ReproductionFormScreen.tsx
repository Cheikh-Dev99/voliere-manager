import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import {
  assertParentsBirthBeforeReproductionDates,
  enregistrerReproduction,
} from '@shared/services/reproductionsService';
import { ReproductionSchema } from '@shared/validators/schemas';
import type { Couple, Pigeon } from '@shared/types';

import { appFeedback } from '../../lib/appFeedback';
import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';
import { AppLoadingView } from '../ui/AppLoadingView';

type FormValues = {
  coupleId: string;
  datePonte: string;
  dateEclosion: string;
  nombreOeufs: string;
  nombrePigeonneaux: string;
  notes: string;
};

function formatCoupleLabel(c: Couple, pigeonById: Map<string, Pigeon>): string {
  const m = pigeonById.get(c.maleId);
  const f = pigeonById.get(c.femelleId);
  const left = m ? m.matricule : '?';
  const right = f ? f.matricule : '?';
  return `${left} + ${right}`;
}

export function ReproductionFormScreen() {
  const { colors: themeColors } = useAppTheme();
  const styles = useMemo(() => createReproductionFormStyles(themeColors), [themeColors]);
  const router = useRouter();
  const { coupleId: coupleIdParam } = useLocalSearchParams<{ coupleId?: string }>();
  const coupleIdFromUrl = (Array.isArray(coupleIdParam) ? coupleIdParam[0] : coupleIdParam)?.trim() ?? '';

  const { couples, loading: loadCouples } = useCouples(true);
  const { pigeons, loading: loadPigeons } = usePigeons(false);
  const [pickCouple, setPickCouple] = useState(false);
  const [urlCoupleApplied, setUrlCoupleApplied] = useState(false);

  const pigeonById = useMemo(() => {
    const m = new Map<string, Pigeon>();
    pigeons.forEach((p) => m.set(p.id, p));
    return m;
  }, [pigeons]);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      coupleId: coupleIdFromUrl,
      datePonte: '',
      dateEclosion: '',
      nombreOeufs: '2',
      nombrePigeonneaux: '0',
      notes: '',
    },
  });

  const coupleId = watch('coupleId');
  const datePonte = watch('datePonte');
  const dateEclosion = watch('dateEclosion');
  const nombreOeufs = watch('nombreOeufs');
  const nombrePigeonneaux = watch('nombrePigeonneaux');
  const notes = watch('notes');

  useEffect(() => {
    if (urlCoupleApplied || !coupleIdFromUrl || loadCouples) return;
    const ok = couples.some((c) => c.id === coupleIdFromUrl);
    if (ok) {
      setValue('coupleId', coupleIdFromUrl);
      setUrlCoupleApplied(true);
    }
  }, [coupleIdFromUrl, couples, loadCouples, setValue, urlCoupleApplied]);

  const coupleSel = useMemo(
    () => (coupleId ? couples.find((x) => x.id === coupleId) : undefined),
    [coupleId, couples],
  );

  const labelCouple = () => {
    if (!coupleId) return '— Choisir un couple —';
    const c = couples.find((x) => x.id === coupleId);
    return c ? formatCoupleLabel(c, pigeonById) : '—';
  };

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const parsed = ReproductionSchema.safeParse({
        coupleId: values.coupleId?.trim() || '',
        datePonte: values.datePonte,
        dateEclosion: values.dateEclosion?.trim() ? values.dateEclosion.trim() : null,
        nombreOeufs: Number(values.nombreOeufs),
        nombrePigeonneaux: Number(values.nombrePigeonneaux),
        notes: (values.notes ?? '').trim(),
      });
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? 'Données invalides';
        appFeedback.alert('Formulaire', msg);
        return;
      }
      const cp = couples.find((x) => x.id === parsed.data.coupleId);
      const male = cp ? pigeonById.get(cp.maleId) : null;
      const femelle = cp ? pigeonById.get(cp.femelleId) : null;
      if (!cp || !male || !femelle) {
        appFeedback.alert('Erreur', 'Couple ou pigeons introuvables pour la validation.');
        return;
      }
      try {
        assertParentsBirthBeforeReproductionDates(
          male,
          femelle,
          new Date(`${parsed.data.datePonte}T12:00:00`),
          parsed.data.dateEclosion?.trim() ? new Date(`${parsed.data.dateEclosion.trim()}T12:00:00`) : null,
        );
      } catch (e) {
        appFeedback.alert('Dates', e instanceof Error ? e.message : 'Dates incohérentes avec les fiches parents');
        return;
      }
      try {
        await enregistrerReproduction({
          coupleId: parsed.data.coupleId,
          datePonte: new Date(`${parsed.data.datePonte}T12:00:00`),
          dateEclosion: parsed.data.dateEclosion?.trim()
            ? new Date(`${parsed.data.dateEclosion.trim()}T12:00:00`)
            : null,
          nombreOeufs: parsed.data.nombreOeufs,
          nombrePigeonneaux: parsed.data.nombrePigeonneaux,
          notes: parsed.data.notes ?? '',
        });
        appFeedback.alert('Succès', 'Reproduction enregistrée.', [
          { text: 'OK', onPress: () => router.replace('/(app)/(tabs)/reproductions') },
        ]);
      } catch (e) {
        appFeedback.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible');
      }
    },
    [couples, pigeonById, router],
  );

  const loading = loadCouples || loadPigeons;

  if (loading) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="reproduction"
          message="Chargement du formulaire…"
          subtitle="Couples et pigeons."
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Nouvelle reproduction</Text>
      <Text style={styles.lead}>
        Choisis un couple actif. Les deux pigeons doivent être actifs au moment de l’enregistrement.
      </Text>

      <View style={styles.card}>
        <Text style={styles.lab}>Couple *</Text>
        <Pressable style={styles.pickBtn} onPress={() => setPickCouple(true)} disabled={couples.length === 0}>
          <Text style={styles.pickTxt}>{labelCouple()}</Text>
        </Pressable>
        {couples.length === 0 ? (
          <Text style={styles.warn}>Aucun couple actif. Crée d’abord un couple depuis le menu ou l’onglet Couples.</Text>
        ) : null}

        {coupleSel ? (
          <View style={styles.preview}>
            <Text style={styles.previewTxt}>
              Mâle :{' '}
              {pigeonById.get(coupleSel.maleId)
                ? `${pigeonById.get(coupleSel.maleId)!.matricule} — ${pigeonById.get(coupleSel.maleId)!.nom}`
                : '—'}{' '}
              · Femelle :{' '}
              {pigeonById.get(coupleSel.femelleId)
                ? `${pigeonById.get(coupleSel.femelleId)!.matricule} — ${pigeonById.get(coupleSel.femelleId)!.nom}`
                : '—'}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.lab, { marginTop: 14 }]}>Date de ponte *</Text>
        <TextInput
          style={styles.inp}
          value={datePonte}
          onChangeText={(t) => setValue('datePonte', t, { shouldDirty: true })}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={themeColors.slate500}
        />
        <Text style={[styles.lab, { marginTop: 14 }]}>Date d’éclosion (optionnel)</Text>
        <TextInput
          style={styles.inp}
          value={dateEclosion}
          onChangeText={(t) => setValue('dateEclosion', t, { shouldDirty: true })}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={themeColors.slate500}
        />
        <View style={styles.row2}>
          <View style={styles.half}>
            <Text style={styles.lab}>Nombre d’œufs *</Text>
            <TextInput
              style={styles.inp}
              value={nombreOeufs}
              onChangeText={(t) => setValue('nombreOeufs', t.replace(/[^\d]/g, ''), { shouldDirty: true })}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.lab}>Pigeonneaux</Text>
            <TextInput
              style={styles.inp}
              value={nombrePigeonneaux}
              onChangeText={(t) => setValue('nombrePigeonneaux', t.replace(/[^\d]/g, ''), { shouldDirty: true })}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={[styles.lab, { marginTop: 14 }]}>Notes</Text>
        <TextInput
          style={[styles.inp, styles.ta]}
          value={notes}
          onChangeText={(t) => setValue('notes', t, { shouldDirty: true })}
          multiline
          placeholderTextColor={themeColors.slate500}
        />
      </View>

      <Pressable
        style={[styles.submit, (isSubmitting || couples.length === 0) && styles.submitDis]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting || couples.length === 0}
      >
        <Text style={styles.submitTxt}>{isSubmitting ? 'Enregistrement…' : 'Enregistrer'}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={styles.btnGhost}>
        <Text style={styles.btnGhostTxt}>Annuler</Text>
      </Pressable>

      <Modal visible={pickCouple} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choisir le couple</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {couples.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.modalRow}
                  onPress={() => {
                    setValue('coupleId', c.id, { shouldDirty: true });
                    setPickCouple(false);
                  }}
                >
                  <Text style={styles.modalRowTxt}>{formatCoupleLabel(c, pigeonById)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setPickCouple(false)}>
              <Text style={styles.modalCloseTxt}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function createReproductionFormStyles(theme: ThemeColors) {
  return StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: theme.screenPadding, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: theme.slate900 },
  lead: { fontSize: 14, color: theme.slate600, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  card: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
  },
  lab: { fontSize: 13, fontWeight: '700', color: theme.slate800, marginBottom: 6 },
  inp: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    color: theme.slate900,
    backgroundColor: theme.surfaceHighlight,
  },
  ta: { minHeight: 80, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 12, marginTop: 4 },
  half: { flex: 1 },
  pickBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    padding: 14,
    backgroundColor: theme.surfaceHighlight,
  },
  pickTxt: { fontSize: 15, color: theme.teal800, fontWeight: '600' },
  preview: {
    marginTop: 10,
    padding: 10,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.surfaceHighlight,
    borderWidth: 1,
    borderColor: theme.border,
  },
  previewTxt: { fontSize: 12, color: theme.slate600, lineHeight: 18 },
  warn: { fontSize: 12, color: theme.amber950, marginTop: 8 },
  submit: {
    marginTop: 20,
    backgroundColor: theme.teal600,
    borderRadius: theme.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDis: { opacity: 0.55 },
  submitTxt: { color: theme.white, fontWeight: '800', fontSize: 16 },
  btnGhost: { marginTop: 12, padding: 12, alignItems: 'center' },
  btnGhostTxt: { color: theme.teal700, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.surfaceElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: theme.slate900 },
  modalRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  modalRowTxt: { fontSize: 16, color: theme.slate900 },
  modalClose: { marginTop: 12, padding: 14, alignItems: 'center' },
  modalCloseTxt: { color: theme.teal700, fontWeight: '800', fontSize: 16 },
  });
}
