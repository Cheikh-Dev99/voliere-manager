import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { useCages } from '@shared/hooks/useCages';
import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import { enregistrerSortie } from '@shared/services/pigeonsService';
import { SortieSchema } from '@shared/validators/schemas';
import type { Pigeon, SortieType } from '@shared/types';

import { theme, shadowCard } from '../../constants/theme';
import { appFeedback } from '../../lib/appFeedback';
import { AppLoadingView } from '../ui/AppLoadingView';
import { PigeonPhotoAvatar } from '../pigeons/PigeonPhotoAvatar';
import { HealthEventDatePicker } from './HealthEventDatePicker';

const TYPE_OPTIONS: { value: SortieType; label: string; hint: string }[] = [
  { value: 'VENTE', label: 'Vente', hint: 'Statut → Vendu' },
  { value: 'DECES', label: 'Décès', hint: 'Statut → Mort' },
  { value: 'PERTE', label: 'Perte', hint: 'Statut → Perdu' },
];

type FormValues = {
  pigeonId: string;
  type: SortieType;
  date: string;
  prix: string;
  acheteur: string;
  cause: string;
  circonstance: string;
  notes: string;
};

function labelPigeon(p: Pigeon | undefined): string {
  if (!p) return '— Choisir un pigeon actif —';
  return `${p.matricule} — ${p.nom}`;
}

export function SortieFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pigeon?: string | string[] }>();
  const pigeonParam = useMemo(() => {
    const raw = params.pigeon;
    if (raw == null) return undefined;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.pigeon]);

  const { pigeons, pigeonsActifs, loading: loadPigeons } = usePigeons(false);
  const { cages, loading: loadCages } = useCages();
  const { couples, loading: loadCouples } = useCouples(true);

  const [pickPigeon, setPickPigeon] = useState(false);
  const [pigeonFilter, setPigeonFilter] = useState('');

  const pigeonsActifsSorted = useMemo(
    () => [...pigeonsActifs].sort((a, b) => a.matricule.localeCompare(b.matricule, 'fr', { numeric: true })),
    [pigeonsActifs],
  );

  const pigeonsForModal = useMemo(() => {
    const q = pigeonFilter.trim().toLowerCase();
    if (!q) return pigeonsActifsSorted;
    return pigeonsActifsSorted.filter(
      (p) =>
        p.matricule.toLowerCase().includes(q) ||
        p.nom.toLowerCase().includes(q) ||
        p.race.toLowerCase().includes(q),
    );
  }, [pigeonsActifsSorted, pigeonFilter]);

  const {
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      pigeonId: '',
      type: 'VENTE',
      date: new Date().toISOString().slice(0, 10),
      prix: '',
      acheteur: '',
      cause: '',
      circonstance: '',
      notes: '',
    },
  });

  const pigeonId = watch('pigeonId');
  const typeSortie = watch('type');
  const dateStr = watch('date');
  const prix = watch('prix');
  const acheteur = watch('acheteur');
  const cause = watch('cause');
  const circonstance = watch('circonstance');
  const notes = watch('notes');

  useEffect(() => {
    if (!pigeonParam || loadPigeons) return;
    const ok = pigeonsActifs.some((p) => p.id === pigeonParam);
    if (ok) setValue('pigeonId', pigeonParam, { shouldDirty: true });
  }, [pigeonParam, pigeonsActifs, loadPigeons, setValue]);

  const contexte = useMemo(() => {
    if (!pigeonId) return null;
    const pigeon = pigeons.find((p) => p.id === pigeonId);
    if (!pigeon) return null;
    const cageSolo = cages.find((c) => c.pigeonId === pigeonId && c.statut === 'OCCUPE_PIGEON');
    const couple = couples.find(
      (c) => c.statut === 'ACTIF' && (c.maleId === pigeonId || c.femelleId === pigeonId),
    );
    const cageCouple = couple?.cageId != null ? cages.find((c) => c.id === couple.cageId) : null;
    const conjointId = couple ? (couple.maleId === pigeonId ? couple.femelleId : couple.maleId) : null;
    const conjoint = conjointId ? pigeons.find((p) => p.id === conjointId) : null;
    return { pigeon, cageSolo, couple, cageCouple, conjoint };
  }, [pigeonId, pigeons, cages, couples]);

  const selectedPigeon = pigeonId ? pigeons.find((p) => p.id === pigeonId) : undefined;
  const selectedInModalList = pigeonId ? pigeonsForModal.some((p) => p.id === pigeonId) : false;

  const onSubmit = useCallback(
    async (values: FormValues) => {
      clearErrors();
      const notesTrim = (values.notes ?? '').trim();
      const dStr = values.date;

      let parsed;
      if (values.type === 'VENTE') {
        const prixNum = values.prix === '' || values.prix == null ? NaN : Number(values.prix.replace(',', '.'));
        parsed = SortieSchema.safeParse({
          type: 'VENTE',
          pigeonId: values.pigeonId?.trim() || '',
          date: dStr,
          prix: prixNum,
          acheteur: (values.acheteur ?? '').trim(),
          notes: notesTrim,
        });
      } else if (values.type === 'DECES') {
        parsed = SortieSchema.safeParse({
          type: 'DECES',
          pigeonId: values.pigeonId?.trim() || '',
          date: dStr,
          cause: (values.cause ?? '').trim(),
          notes: notesTrim,
        });
      } else {
        parsed = SortieSchema.safeParse({
          type: 'PERTE',
          pigeonId: values.pigeonId?.trim() || '',
          date: dStr,
          circonstance: (values.circonstance ?? '').trim(),
          notes: notesTrim,
        });
      }

      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors;
        Object.entries(flat).forEach(([key, msgs]) => {
          const k = key as keyof FormValues;
          if (msgs?.[0]) setError(k, { type: 'manual', message: msgs[0] });
        });
        appFeedback.error('Formulaire', 'Merci de corriger les champs indiqués.');
        return;
      }

      const d = parsed.data;
      const dateObj = new Date(`${d.date}T12:00:00`);

      try {
        await enregistrerSortie({
          pigeonId: d.pigeonId,
          type: d.type,
          date: dateObj,
          prix: d.type === 'VENTE' ? d.prix : null,
          acheteur: d.type === 'VENTE' ? d.acheteur : null,
          cause: d.type === 'DECES' ? (d.cause?.trim() ? d.cause.trim() : null) : null,
          circonstance: d.type === 'PERTE' ? (d.circonstance?.trim() ? d.circonstance.trim() : null) : null,
          notes: d.notes ?? '',
        });
        appFeedback.success('Sortie enregistrée', 'Pigeon, cages et couple éventuel ont été mis à jour.');
        router.replace('/sorties');
      } catch (e) {
        appFeedback.error('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible.');
      }
    },
    [clearErrors, router, setError],
  );

  const loading = loadPigeons || loadCages || loadCouples;

  if (loading) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="sorties"
          message="Chargement du formulaire…"
          subtitle="Pigeons, cages et couples."
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Nouvelle sortie</Text>
        <Text style={styles.lead}>
          Enregistre une vente, un décès ou une perte. Le pigeon doit être <Text style={styles.leadBold}>actif</Text> ;
          la cage ou le couple actif sera mis à jour automatiquement.
        </Text>

        <View style={[styles.card, shadowCard]}>
          <Text style={styles.lab}>Pigeon *</Text>
          <Pressable style={styles.pickBtn} onPress={() => setPickPigeon(true)}>
            <View style={styles.pickRow}>
              <PigeonPhotoAvatar pigeon={selectedPigeon} size="sm" />
              <Text style={styles.pickTxt}>{labelPigeon(selectedPigeon)}</Text>
            </View>
          </Pressable>
          {errors.pigeonId ? <Text style={styles.errTxt}>{errors.pigeonId.message}</Text> : null}
          {pigeonsActifsSorted.length === 0 ? (
            <Text style={styles.warn}>Aucun pigeon actif : réactive une fiche ou crée un pigeon avant une sortie.</Text>
          ) : null}

          {contexte ? (
            <View style={styles.ctx}>
              <Text style={styles.ctxTit}>Contexte</Text>
              {contexte.cageSolo ? (
                <Text style={styles.ctxLine}>
                  Cage seule : {contexte.cageSolo.voliereCode ?? 'A'} · {contexte.cageSolo.numero}
                </Text>
              ) : null}
              {contexte.couple ? (
                <Text style={styles.ctxLine}>
                  Couple actif
                  {contexte.conjoint ? ` avec ${contexte.conjoint.matricule}` : ''}
                  {contexte.cageCouple
                    ? ` — cage ${contexte.cageCouple.voliereCode ?? 'A'} · ${contexte.cageCouple.numero}`
                    : ''}
                </Text>
              ) : (
                <Text style={styles.ctxLine}>Pas de couple actif pour ce pigeon.</Text>
              )}
            </View>
          ) : null}

          <Text style={[styles.lab, { marginTop: 14 }]}>Type *</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => {
              const on = typeSortie === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setValue('type', opt.value, { shouldDirty: true })}
                  style={[styles.typeChip, on && styles.typeChipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.typeChipTxt, on && styles.typeChipTxtOn]}>{opt.label}</Text>
                  <Text style={[styles.typeChipHint, on && styles.typeChipHintOn]}>{opt.hint}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.lab, { marginTop: 14 }]}>Date de la sortie *</Text>
          <HealthEventDatePicker
            value={dateStr}
            onChange={(iso) => setValue('date', iso, { shouldDirty: true })}
            hint="Date effective de la vente, du décès ou de la constatation de perte."
            sheetTitle="Date de la sortie"
            placeholderChoose="Choisir la date de la sortie"
            accessibilityLabel="Choisir la date de la sortie"
          />
          {errors.date ? <Text style={styles.errTxt}>{errors.date.message}</Text> : null}

          {typeSortie === 'VENTE' ? (
            <>
              <Text style={[styles.lab, { marginTop: 14 }]}>Prix *</Text>
              <TextInput
                style={[styles.inp, errors.prix && styles.inpErr]}
                value={prix}
                onChangeText={(t) => setValue('prix', t, { shouldDirty: true })}
                placeholder="0"
                placeholderTextColor={theme.slate500}
                keyboardType="decimal-pad"
              />
              {errors.prix ? <Text style={styles.errTxt}>{errors.prix.message}</Text> : null}
              <Text style={[styles.lab, { marginTop: 14 }]}>Acheteur *</Text>
              <TextInput
                style={[styles.inp, errors.acheteur && styles.inpErr]}
                value={acheteur}
                onChangeText={(t) => setValue('acheteur', t, { shouldDirty: true })}
                placeholder="Nom ou contact"
                placeholderTextColor={theme.slate500}
              />
              {errors.acheteur ? <Text style={styles.errTxt}>{errors.acheteur.message}</Text> : null}
            </>
          ) : null}

          {typeSortie === 'DECES' ? (
            <>
              <Text style={[styles.lab, { marginTop: 14 }]}>Cause (optionnel)</Text>
              <TextInput
                style={styles.inp}
                value={cause}
                onChangeText={(t) => setValue('cause', t, { shouldDirty: true })}
                placeholder="Maladie, vieillesse…"
                placeholderTextColor={theme.slate500}
              />
              {errors.cause ? <Text style={styles.errTxt}>{errors.cause.message}</Text> : null}
            </>
          ) : null}

          {typeSortie === 'PERTE' ? (
            <>
              <Text style={[styles.lab, { marginTop: 14 }]}>Circonstance (optionnel)</Text>
              <TextInput
                style={styles.inp}
                value={circonstance}
                onChangeText={(t) => setValue('circonstance', t, { shouldDirty: true })}
                placeholder="Vol, échappée…"
                placeholderTextColor={theme.slate500}
              />
              {errors.circonstance ? <Text style={styles.errTxt}>{errors.circonstance.message}</Text> : null}
            </>
          ) : null}

          <Text style={[styles.lab, { marginTop: 14 }]}>Notes</Text>
          <TextInput
            style={[styles.inp, styles.ta]}
            value={notes}
            onChangeText={(t) => setValue('notes', t, { shouldDirty: true })}
            placeholder="Remarques complémentaires…"
            placeholderTextColor={theme.slate500}
            multiline
          />
          {errors.notes ? <Text style={styles.errTxt}>{errors.notes.message}</Text> : null}
        </View>

        <Pressable
          style={[styles.submit, (isSubmitting || pigeonsActifsSorted.length === 0) && styles.submitDis]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || pigeonsActifsSorted.length === 0}
        >
          <Text style={styles.submitTxt}>{isSubmitting ? 'Enregistrement…' : 'Valider la sortie'}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.btnGhost}>
          <Text style={styles.btnGhostTxt}>Annuler</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={pickPigeon} animationType="slide" transparent onRequestClose={() => setPickPigeon(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choisir le pigeon</Text>
            <TextInput
              style={styles.filterInp}
              value={pigeonFilter}
              onChangeText={setPigeonFilter}
              placeholder="Filtrer par matricule, nom…"
              placeholderTextColor={theme.slate500}
            />
            <ScrollView style={{ maxHeight: 400 }}>
              {pigeonId && selectedPigeon && !selectedInModalList ? (
                <Pressable
                  style={styles.modalRow}
                  onPress={() => {
                    setValue('pigeonId', selectedPigeon.id, { shouldDirty: true });
                    setPickPigeon(false);
                    setPigeonFilter('');
                  }}
                >
                  <View style={styles.modalRowRow}>
                    <PigeonPhotoAvatar pigeon={selectedPigeon} size="sm" />
                    <View style={styles.modalRowText}>
                      <Text style={styles.modalRowTxtBold}>{labelPigeon(selectedPigeon)}</Text>
                      <Text style={styles.modalRowSub}>(sélection actuelle)</Text>
                    </View>
                  </View>
                </Pressable>
              ) : null}
              {pigeonsForModal.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.modalRow}
                  onPress={() => {
                    setValue('pigeonId', p.id, { shouldDirty: true });
                    setPickPigeon(false);
                    setPigeonFilter('');
                  }}
                >
                  <View style={styles.modalRowRow}>
                    <PigeonPhotoAvatar pigeon={p} size="sm" />
                    <View style={styles.modalRowText}>
                      <Text style={styles.modalRowTxt}>
                        {p.matricule} — {p.nom}
                      </Text>
                      <Text style={styles.modalRowSub}>{p.race}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setPickPigeon(false)}>
              <Text style={styles.modalCloseTxt}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'transparent' },
  scroll: { padding: theme.screenPadding, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '800', color: theme.slate900 },
  lead: { fontSize: 14, color: theme.slate600, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  leadBold: { fontWeight: '800', color: theme.slate800 },
  card: {
    backgroundColor: theme.white,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 8,
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
    backgroundColor: theme.slate50,
  },
  inpErr: { borderColor: theme.red600 },
  ta: { minHeight: 88, textAlignVertical: 'top' },
  pickBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    padding: 14,
    backgroundColor: theme.slate50,
  },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickTxt: { flex: 1, minWidth: 0, fontSize: 15, color: theme.teal800, fontWeight: '600' },
  errTxt: { color: theme.red600, fontSize: 12, marginTop: 4 },
  warn: { fontSize: 12, color: theme.amber950, marginTop: 8 },
  ctx: {
    marginTop: 12,
    padding: 10,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.teal50,
    borderWidth: 1,
    borderColor: theme.teal100,
  },
  ctxTit: { fontSize: 11, fontWeight: '800', color: theme.teal900, marginBottom: 6, letterSpacing: 0.5 },
  ctxLine: { fontSize: 12, color: theme.teal800, lineHeight: 17 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flex: 1,
    minWidth: 88,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: theme.slate50,
  },
  typeChipOn: {
    borderColor: theme.teal600,
    backgroundColor: theme.teal50,
  },
  typeChipTxt: { fontSize: 13, fontWeight: '800', color: theme.slate700, textAlign: 'center' },
  typeChipTxtOn: { color: theme.teal900 },
  typeChipHint: { fontSize: 10, color: theme.slate500, textAlign: 'center', marginTop: 4 },
  typeChipHintOn: { color: theme.teal800 },
  submit: {
    marginTop: 16,
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
    backgroundColor: theme.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10, color: theme.slate900 },
  filterInp: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 8,
    color: theme.slate900,
  },
  modalRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  modalRowRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalRowText: { flex: 1, minWidth: 0 },
  modalRowTxt: { fontSize: 16, color: theme.slate900, fontWeight: '600' },
  modalRowTxtBold: { fontSize: 16, color: theme.slate900, fontWeight: '800' },
  modalRowSub: { fontSize: 12, color: theme.slate500, marginTop: 2 },
  modalClose: { marginTop: 12, padding: 14, alignItems: 'center' },
  modalCloseTxt: { color: theme.teal700, fontWeight: '800', fontSize: 16 },
});
