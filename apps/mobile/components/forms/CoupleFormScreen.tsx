import { useCallback, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';

import { useCages } from '@shared/hooks/useCages';
import { useCouples } from '@shared/hooks/useCouples';
import { usePigeons } from '@shared/hooks/usePigeons';
import { creerCouple } from '@shared/services/couplesService';
import { CoupleSchema } from '@shared/validators/schemas';
import type { Cage, Pigeon } from '@shared/types';

import { appFeedback } from '../../lib/appFeedback';
import { theme } from '../../constants/theme';
import { AppLoadingView } from '../ui/AppLoadingView';

type FormValues = {
  maleId: string;
  femelleId: string;
  dateDebut: string;
  cageId: string;
  notes: string;
};

type PickKind = 'male' | 'femelle' | 'cage' | null;

export function CoupleFormScreen() {
  const router = useRouter();
  const { pigeons, loading: loadPigeons } = usePigeons(false);
  const { cages, loading: loadCages } = useCages();
  const { couples, loading: loadCouples } = useCouples(false);
  const [pick, setPick] = useState<PickKind>(null);

  const idsDansCoupleActif = useMemo(() => {
    const s = new Set<string>();
    for (const c of couples) {
      if (c.statut !== 'ACTIF') continue;
      s.add(c.maleId);
      s.add(c.femelleId);
    }
    return s;
  }, [couples]);

  const malesChoix = useMemo(
    () =>
      pigeons.filter((p) => p.sexe === 'MALE' && p.statut === 'ACTIF' && !idsDansCoupleActif.has(p.id)),
    [pigeons, idsDansCoupleActif],
  );

  const femellesChoix = useMemo(
    () =>
      pigeons.filter((p) => p.sexe === 'FEMALE' && p.statut === 'ACTIF' && !idsDansCoupleActif.has(p.id)),
    [pigeons, idsDansCoupleActif],
  );

  const cagesLibres = useMemo(() => cages.filter((c) => c.statut === 'LIBRE'), [cages]);

  const {
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      maleId: '',
      femelleId: '',
      dateDebut: '',
      cageId: '',
      notes: '',
    },
  });

  const maleId = watch('maleId');
  const femelleId = watch('femelleId');
  const cageId = watch('cageId');
  const dateDebut = watch('dateDebut');
  const notes = watch('notes');

  const labelPigeon = (id: string) => {
    const p = pigeons.find((x) => x.id === id);
    return p ? `${p.matricule} — ${p.nom}` : '— Choisir —';
  };

  const labelCage = () => {
    if (!cageId) return '— Aucune cage —';
    const c = cages.find((x) => x.id === cageId);
    return c ? `${c.voliereCode ?? 'A'} · ${c.numero} — ${c.nom}` : '—';
  };

  const onSubmit = useCallback(
    async (values: FormValues) => {
      clearErrors();
      const parsed = CoupleSchema.safeParse({
        maleId: values.maleId?.trim() || '',
        femelleId: values.femelleId?.trim() || '',
        dateDebut: values.dateDebut,
        cageId: values.cageId?.trim() || null,
        notes: (values.notes ?? '').trim(),
      });
      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors;
        Object.entries(flat).forEach(([key, msgs]) => {
          const k = key as keyof FormValues;
          if (msgs?.[0]) setError(k, { type: 'manual', message: msgs[0] });
        });
        appFeedback.alert('Formulaire', 'Merci de corriger les champs indiqués.');
        return;
      }
      try {
        await creerCouple({
          maleId: parsed.data.maleId,
          femelleId: parsed.data.femelleId,
          dateDebut: new Date(`${parsed.data.dateDebut}T12:00:00`),
          cageId: parsed.data.cageId ?? null,
          notes: parsed.data.notes ?? '',
        });
        appFeedback.alert('Succès', 'Couple créé.', [
          { text: 'OK', onPress: () => router.replace('/(app)/(tabs)/couples') },
        ]);
      } catch (e) {
        appFeedback.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible');
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
          loadingContext="couples"
          message="Chargement du formulaire…"
          subtitle="Pigeons, cages et couples."
        />
      </View>
    );
  }

  const pickList: Pigeon[] | (Cage | null)[] =
    pick === 'male' ? malesChoix : pick === 'femelle' ? femellesChoix : pick === 'cage' ? [null, ...cagesLibres] : [];

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>Nouveau couple</Text>
      <Text style={styles.lead}>
        Mâle et femelle actifs, non déjà dans un couple actif. Tu peux optionnellement attribuer une cage libre.
      </Text>

      <View style={styles.card}>
        <Text style={styles.lab}>Mâle *</Text>
        <Pressable style={styles.pickBtn} onPress={() => setPick('male')}>
          <Text style={styles.pickTxt}>{labelPigeon(maleId)}</Text>
        </Pressable>
        {errors.maleId ? <Text style={styles.errTxt}>{errors.maleId.message}</Text> : null}
        {malesChoix.length === 0 ? (
          <Text style={styles.warn}>Aucun mâle actif disponible pour un nouveau couple.</Text>
        ) : null}

        <Text style={[styles.lab, { marginTop: 14 }]}>Femelle *</Text>
        <Pressable style={styles.pickBtn} onPress={() => setPick('femelle')}>
          <Text style={styles.pickTxt}>{labelPigeon(femelleId)}</Text>
        </Pressable>
        {errors.femelleId ? <Text style={styles.errTxt}>{errors.femelleId.message}</Text> : null}
        {femellesChoix.length === 0 ? (
          <Text style={styles.warn}>Aucune femelle active disponible pour un nouveau couple.</Text>
        ) : null}

        <Text style={[styles.lab, { marginTop: 14 }]}>Date de début *</Text>
        <TextInput
          style={[styles.inp, errors.dateDebut && styles.inpErr]}
          value={dateDebut}
          onChangeText={(t) => setValue('dateDebut', t, { shouldDirty: true })}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor={theme.slate500}
        />
        {errors.dateDebut ? <Text style={styles.errTxt}>{errors.dateDebut.message}</Text> : null}

        <Text style={[styles.lab, { marginTop: 14 }]}>Cage (optionnel)</Text>
        <Pressable style={styles.pickBtn} onPress={() => setPick('cage')}>
          <Text style={styles.pickTxt}>{labelCage()}</Text>
        </Pressable>
        {errors.cageId ? <Text style={styles.errTxt}>{errors.cageId.message}</Text> : null}
        {cagesLibres.length === 0 ? (
          <Text style={styles.hint}>Aucune cage libre : tu pourras affecter le couple depuis la visualisation.</Text>
        ) : null}

        <Text style={[styles.lab, { marginTop: 14 }]}>Notes</Text>
        <TextInput
          style={[styles.inp, styles.ta]}
          value={notes}
          onChangeText={(t) => setValue('notes', t, { shouldDirty: true })}
          placeholder="Remarques…"
          placeholderTextColor={theme.slate500}
          multiline
        />
        {errors.notes ? <Text style={styles.errTxt}>{errors.notes.message}</Text> : null}
      </View>

      <Pressable
        style={[styles.submit, (isSubmitting || !malesChoix.length || !femellesChoix.length) && styles.submitDis]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting || malesChoix.length === 0 || femellesChoix.length === 0}
      >
        <Text style={styles.submitTxt}>{isSubmitting ? 'Enregistrement…' : 'Créer le couple'}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={styles.btnGhost}>
        <Text style={styles.btnGhostTxt}>Annuler</Text>
      </Pressable>

      <Modal visible={pick !== null} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {pick === 'male' ? 'Choisir le mâle' : pick === 'femelle' ? 'Choisir la femelle' : 'Choisir une cage'}
            </Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {pick === 'cage'
                ? (pickList as (Cage | null)[]).map((item) => (
                    <Pressable
                      key={item === null ? '__none' : item.id}
                      style={styles.modalRow}
                      onPress={() => {
                        setValue('cageId', item === null ? '' : item.id, { shouldDirty: true });
                        setPick(null);
                      }}
                    >
                      <Text style={styles.modalRowTxt}>
                        {item === null ? '— Aucune cage —' : `${item.voliereCode ?? 'A'} · ${item.numero} — ${item.nom}`}
                      </Text>
                    </Pressable>
                  ))
                : (pickList as Pigeon[]).map((p) => (
                    <Pressable
                      key={p.id}
                      style={styles.modalRow}
                      onPress={() => {
                        if (pick === 'male') setValue('maleId', p.id, { shouldDirty: true });
                        else if (pick === 'femelle') setValue('femelleId', p.id, { shouldDirty: true });
                        setPick(null);
                      }}
                    >
                      <Text style={styles.modalRowTxt}>
                        {p.matricule} — {p.nom}
                      </Text>
                    </Pressable>
                  ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setPick(null)}>
              <Text style={styles.modalCloseTxt}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: theme.screenPadding, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: theme.slate900 },
  lead: { fontSize: 14, color: theme.slate600, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  card: {
    backgroundColor: theme.white,
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
    backgroundColor: theme.slate50,
  },
  inpErr: { borderColor: theme.red600 },
  ta: { minHeight: 80, textAlignVertical: 'top' },
  pickBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    padding: 14,
    backgroundColor: theme.slate50,
  },
  pickTxt: { fontSize: 15, color: theme.teal800, fontWeight: '600' },
  errTxt: { color: theme.red600, fontSize: 12, marginTop: 4 },
  warn: { fontSize: 12, color: theme.amber950, marginTop: 6 },
  hint: { fontSize: 12, color: theme.slate500, marginTop: 6 },
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
    backgroundColor: theme.white,
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
