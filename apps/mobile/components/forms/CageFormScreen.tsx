import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Sparkles } from 'lucide-react-native';

import { useCages } from '@shared/hooks/useCages';
import { creerCage, creerCagesLot, modifierCage, obtenirCage } from '@shared/services/cagesService';
import { CageSchema } from '@shared/validators/schemas';
import {
  buildNumerosRange,
  CAGE_LOT_MAX,
  proposerNumeroCageSuivant,
} from '@shared/utils/cageNumeroProposition';

import { appFeedback } from '../../lib/appFeedback';
import { useMergedVoliereCodes } from '../../hooks/useMergedVoliereCodes';
import { MobileLabeledSelect } from '../ui/MobileLabeledSelect';
import { AppLoadingView } from '../ui/AppLoadingView';
import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';

type SingleForm = {
  voliereCode: string;
  numero: string;
  nom: string;
  superficie: number;
  description: string;
};

type Props =
  | { mode: 'create'; defaultVoliere?: string }
  | { mode: 'edit'; cageId: string };

export function CageFormScreen(props: Props) {
  const { colors: themeColors } = useAppTheme();
  const styles = useMemo(() => createCageFormStyles(themeColors), [themeColors]);
  const router = useRouter();
  const { cages } = useCages();
  const isEdit = props.mode === 'edit';
  const cageId = props.mode === 'edit' ? props.cageId : undefined;
  const defaultVoliere = props.mode === 'create' ? (props.defaultVoliere ?? 'A') : 'A';

  const [tab, setTab] = useState<'single' | 'lot'>(() => (isEdit ? 'single' : 'single'));
  const [loadingCage, setLoadingCage] = useState(isEdit);
  const [cageRemote, setCageRemote] = useState<Awaited<ReturnType<typeof obtenirCage>>>(null);

  const [lotVoliere, setLotVoliere] = useState(defaultVoliere);
  const [lotSuperficie, setLotSuperficie] = useState(0.5);
  const [lotDescription, setLotDescription] = useState('');
  const [lotPrefix, setLotPrefix] = useState('A');
  const [lotStart, setLotStart] = useState(1);
  const [lotEnd, setLotEnd] = useState(20);
  const [lotPad, setLotPad] = useState(2);
  const [lotNameTpl, setLotNameTpl] = useState('Cage {n}');
  const [lotSubmitting, setLotSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SingleForm>({
    defaultValues: {
      voliereCode: defaultVoliere,
      numero: '',
      nom: '',
      superficie: 0.5,
      description: '',
    },
  });

  const mergedVoliereCodes = useMergedVoliereCodes();

  const lotMergedOptions = useMemo(
    () => [...mergedVoliereCodes].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })),
    [mergedVoliereCodes],
  );

  const lotPadSelectOptions = useMemo(
    () => [
      { value: '1', label: '1 — A1' },
      { value: '2', label: '2 — A01' },
      { value: '3', label: '3 — A001' },
      { value: '4', label: '4 — A0001' },
    ],
    [],
  );

  const voliereOptionsSingle = useMemo(() => {
    const sorted = [...mergedVoliereCodes].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
    if (isEdit && cageRemote) {
      const v = (cageRemote.voliereCode ?? '').trim();
      if (v && !sorted.includes(v)) {
        return [...sorted, v].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
      }
    }
    return sorted;
  }, [mergedVoliereCodes, isEdit, cageRemote]);

  useEffect(() => {
    if (lotMergedOptions.length === 0) return;
    const cur = lotVoliere.trim();
    if (!lotMergedOptions.includes(cur)) {
      setLotVoliere(lotMergedOptions[0] ?? 'A');
    }
  }, [lotMergedOptions, lotVoliere]);

  useEffect(() => {
    if (isEdit) return;
    if (voliereOptionsSingle.length === 0) return;
    const cur = (getValues('voliereCode') ?? '').trim();
    if (!voliereOptionsSingle.includes(cur)) {
      const next = voliereOptionsSingle[0] ?? 'A';
      setValue('voliereCode', next, { shouldValidate: true });
      setLotVoliere(next);
    }
  }, [voliereOptionsSingle, isEdit, getValues, setValue]);

  const lotPreview = useMemo(() => {
    const prefix = lotPrefix.trim() || 'A';
    const pad = Math.min(4, Math.max(1, Math.floor(Number(lotPad) || 2)));
    const lo = Math.floor(Number(lotStart) || 1);
    const hi = Math.floor(Number(lotEnd) || 1);
    const numeros = buildNumerosRange(prefix, lo, hi, pad);
    const count = numeros.length;
    const existingKeys = new Set(cages.map((c) => `${c.voliereCode ?? 'A'}|${(c.numero ?? '').trim()}`));
    const volCode = lotVoliere.trim() || 'A';
    const conflicts = numeros.filter((n) => existingKeys.has(`${volCode}|${n}`));
    const head = numeros.slice(0, 3);
    const tail = count > 6 ? numeros.slice(-2) : [];
    return { numeros, count, conflicts, head, tail };
  }, [lotPrefix, lotStart, lotEnd, lotPad, lotVoliere, cages]);

  useEffect(() => {
    if (!isEdit || !cageId) return;
    let cancelled = false;
    (async () => {
      setLoadingCage(true);
      try {
        const c = await obtenirCage(cageId);
        if (cancelled) return;
        setCageRemote(c);
        if (c) {
          reset({
            voliereCode: c.voliereCode ?? 'A',
            numero: c.numero ?? '',
            nom: c.nom ?? '',
            superficie: typeof c.superficie === 'number' ? c.superficie : 0.5,
            description: c.description ?? '',
          });
        }
      } finally {
        if (!cancelled) setLoadingCage(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, cageId, reset]);

  const onGenerateNumero = useCallback(() => {
    const volRaw = (getValues('voliereCode') ?? '').trim();
    if (!volRaw) {
      appFeedback.alert('Volière (nom court)', 'Indique d’abord une volière (son nom court).');
      return;
    }
    const next = proposerNumeroCageSuivant(volRaw, cages, isEdit ? cageId : undefined);
    setValue('numero', next, { shouldValidate: true, shouldDirty: true });
    clearErrors('numero');
    appFeedback.alert('Numéro proposé', `${next}\n(tu peux l’ajuster)`);
  }, [cages, cageId, clearErrors, getValues, isEdit, setValue]);

  const onSubmitSingle = handleSubmit(async (values) => {
    const parsed = CageSchema.safeParse({
      ...values,
      voliereCode: (values.voliereCode ?? '').trim() || 'A',
      superficie: Number(values.superficie),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      appFeedback.alert('Validation', first?.message ?? 'Données invalides');
      return;
    }
    try {
      if (isEdit && cageId) {
        await modifierCage(cageId, parsed.data);
        appFeedback.alert('Succès', 'Cage mise à jour.', [
          { text: 'OK', onPress: () => router.replace(`/(app)/cage/${cageId}`) },
        ]);
      } else {
        const id = await creerCage(parsed.data);
        appFeedback.alert('Succès', 'Cage créée.', [
          { text: 'OK', onPress: () => router.replace(`/(app)/(tabs)/cages`) },
        ]);
        void id;
      }
    } catch (e) {
      appFeedback.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible');
    }
  });

  const onSubmitLot = async () => {
    const { numeros, count, conflicts } = lotPreview;
    if (count === 0) {
      appFeedback.alert('Lot', 'Indique une plage valide (du … au …).');
      return;
    }
    if (count > CAGE_LOT_MAX) {
      appFeedback.alert('Lot', `Maximum ${CAGE_LOT_MAX} cages par envoi.`);
      return;
    }
    if (conflicts.length > 0) {
      appFeedback.alert(
        'Conflit',
        `Numéros déjà utilisés : ${conflicts.slice(0, 8).join(', ')}${conflicts.length > 8 ? '…' : ''}`,
      );
      return;
    }
    const volCode = lotVoliere.trim() || 'A';
    const sup = Number(lotSuperficie);
    const desc = (lotDescription ?? '').trim();
    const loIdx = Math.min(Number(lotStart) || 1, Number(lotEnd) || 1);
    const itemsPayload = [];
    for (let idx = 0; idx < numeros.length; idx += 1) {
      const numero = numeros[idx]!;
      const i = loIdx + idx;
      const nom = lotNameTpl.replace(/\{n\}/g, numero).replace(/\{i\}/g, String(i));
      const raw = { voliereCode: volCode, numero, nom, superficie: sup, description: desc };
      const parsed = CageSchema.safeParse(raw);
      if (!parsed.success) {
        appFeedback.alert('Validation', parsed.error.issues[0]?.message ?? 'Données invalides');
        return;
      }
      itemsPayload.push(parsed.data);
    }
    setLotSubmitting(true);
    try {
      const n = await creerCagesLot(itemsPayload);
      appFeedback.alert('Succès', `${n} cage${n > 1 ? 's' : ''} créée${n > 1 ? 's' : ''}.`, [
        { text: 'OK', onPress: () => router.replace('/(app)/(tabs)/cages') },
      ]);
    } catch (err) {
      appFeedback.alert('Erreur', err instanceof Error ? err.message : 'Création du lot impossible');
    } finally {
      setLotSubmitting(false);
    }
  };

  if (isEdit && loadingCage) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="cages"
          message="Chargement de la cage…"
          subtitle="Formulaire d’édition."
        />
      </View>
    );
  }

  if (isEdit && !loadingCage && !cageRemote) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Cage introuvable.</Text>
        <Pressable onPress={() => router.back()} style={styles.btnGhost}>
          <Text style={styles.btnGhostTxt}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {!isEdit ? (
        <View style={styles.segRow}>
          <Pressable onPress={() => setTab('single')} style={[styles.seg, tab === 'single' && styles.segOn]}>
            <Text style={[styles.segTxt, tab === 'single' && styles.segTxtOn]}>Une cage</Text>
          </Pressable>
          <Pressable onPress={() => setTab('lot')} style={[styles.seg, tab === 'lot' && styles.segOn]}>
            <Text style={[styles.segTxt, tab === 'lot' && styles.segTxtOn]}>Série (lot)</Text>
          </Pressable>
        </View>
      ) : null}

      {!isEdit && tab === 'lot' ? (
        <View style={styles.card}>
          <Text style={styles.hint}>
            Même volière, superficie et description. Numéros générés (ex. A01…A20). Nom : {'{n}'} = numéro, {'{i}'} =
            indice.
          </Text>

          {lotMergedOptions.length === 0 ? (
            <>
              <Text style={styles.lab}>Volière (nom court)</Text>
              <TextInput
                style={styles.inp}
                value={lotVoliere}
                onChangeText={setLotVoliere}
                placeholder="Ex. A"
                maxLength={8}
              />
            </>
          ) : (
            <MobileLabeledSelect
              label="Volière (nom court)"
              options={lotMergedOptions.map((code) => ({ value: code, label: code }))}
              value={lotMergedOptions.includes(lotVoliere.trim()) ? lotVoliere.trim() : (lotMergedOptions[0] ?? 'A')}
              onChange={setLotVoliere}
              containerStyle={{ width: '100%' }}
            />
          )}

          <View style={[styles.row2, { marginTop: 12 }]}>
            <View style={styles.flex}>
              <Text style={styles.lab}>Préfixe du numéro</Text>
              <TextInput style={styles.inp} value={lotPrefix} onChangeText={setLotPrefix} placeholder="A" />
            </View>
            <MobileLabeledSelect
              label="Chiffres (padding)"
              options={lotPadSelectOptions}
              value={String(Math.min(4, Math.max(1, Math.floor(Number(lotPad) || 2))))}
              onChange={(v) => setLotPad(Number(v) || 2)}
              containerStyle={styles.flex}
            />
          </View>

          <Text style={styles.lab}>De → À</Text>
          <View style={styles.row2}>
            <TextInput
              style={[styles.inp, styles.flex]}
              keyboardType="number-pad"
              value={String(lotStart)}
              onChangeText={(t) => setLotStart(parseInt(t, 10) || 1)}
            />
            <TextInput
              style={[styles.inp, styles.flex]}
              keyboardType="number-pad"
              value={String(lotEnd)}
              onChangeText={(t) => setLotEnd(parseInt(t, 10) || 1)}
            />
          </View>

          <Text style={styles.lab}>Modèle du nom</Text>
          <TextInput style={styles.inp} value={lotNameTpl} onChangeText={setLotNameTpl} placeholder="Cage {n}" />

          <Text style={styles.lab}>Superficie (m²)</Text>
          <TextInput
            style={styles.inp}
            keyboardType="decimal-pad"
            value={String(lotSuperficie)}
            onChangeText={(t) => setLotSuperficie(parseFloat(t.replace(',', '.')) || 0.5)}
          />

          <Text style={styles.lab}>Description</Text>
          <TextInput
            style={[styles.inp, styles.ta]}
            value={lotDescription}
            onChangeText={setLotDescription}
            multiline
          />

          <View
            style={[
              styles.preview,
              lotPreview.count > CAGE_LOT_MAX && styles.previewErr,
              lotPreview.conflicts.length > 0 && styles.previewWarn,
            ]}
          >
            <Text style={styles.previewTit}>
              Aperçu : {lotPreview.count} cage{lotPreview.count > 1 ? 's' : ''}
              {lotPreview.count > CAGE_LOT_MAX ? ` (max ${CAGE_LOT_MAX})` : ''}
            </Text>
            {lotPreview.count > 0 && lotPreview.count <= CAGE_LOT_MAX ? (
              <Text style={styles.previewMono}>
                {lotPreview.head.join(', ')}
                {lotPreview.count > 6 ? ` … ${lotPreview.tail.join(', ')}` : lotPreview.count > 3 ? ' …' : ''}
              </Text>
            ) : null}
            {lotPreview.conflicts.length > 0 ? (
              <Text style={styles.previewWarntxt}>Conflit avec des cages existantes.</Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => void onSubmitLot()}
            disabled={
              lotSubmitting ||
              lotPreview.count === 0 ||
              lotPreview.count > CAGE_LOT_MAX ||
              lotPreview.conflicts.length > 0
            }
            style={[styles.btnPri, lotSubmitting && styles.btnDis]}
          >
            <Text style={styles.btnPriTxt}>{lotSubmitting ? 'Création…' : `Créer ${lotPreview.count || '…'} cage(s)`}</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.btnSec}>
            <Text style={styles.btnSecTxt}>Annuler</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Controller
            control={control}
            name="voliereCode"
            render={({ field: { value, onChange, onBlur } }) => {
              const vcTrim = (value ?? '').trim();
              const opts = voliereOptionsSingle;

              if (opts.length === 0) {
                return (
                  <View>
                    <Text style={styles.lab}>Volière (nom court)</Text>
                    <TextInput
                      style={styles.inp}
                      value={value ?? ''}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Ex. A"
                      maxLength={8}
                    />
                  </View>
                );
              }
              return (
                <MobileLabeledSelect
                  label="Volière (nom court)"
                  options={opts.map((code) => ({ value: code, label: code }))}
                  value={opts.includes(vcTrim) ? vcTrim : opts[0] ?? 'A'}
                  onChange={onChange}
                  containerStyle={{ width: '100%' }}
                />
              );
            }}
          />
          {errors.voliereCode ? <Text style={styles.errTxt}>{errors.voliereCode.message}</Text> : null}

          <Text style={[styles.lab, { marginTop: 12 }]}>Numéro de cage</Text>
          <View style={styles.rowGen}>
            <Controller
              control={control}
              name="numero"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  style={[styles.inp, styles.flex]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="ex. A01"
                  autoCapitalize="characters"
                />
              )}
            />
            <Pressable onPress={onGenerateNumero} style={styles.genBtn} accessibilityLabel="Générer le numéro">
              <Sparkles size={18} color={themeColors.teal800} />
              <Text style={styles.genTxt}>Générer</Text>
            </Pressable>
          </View>
          {errors.numero ? <Text style={styles.errTxt}>{errors.numero.message}</Text> : null}
          <Text style={styles.micro}>Prochain numéro libre pour la volière (série A01, A02…).</Text>

          <Text style={styles.lab}>Nom</Text>
          <Controller
            control={control}
            name="nom"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput style={styles.inp} value={value} onChangeText={onChange} onBlur={onBlur} />
            )}
          />
          {errors.nom ? <Text style={styles.errTxt}>{errors.nom.message}</Text> : null}

          <Text style={styles.lab}>Superficie (m²)</Text>
          <Controller
            control={control}
            name="superficie"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                style={styles.inp}
                keyboardType="decimal-pad"
                value={String(value)}
                onChangeText={(t) => onChange(parseFloat(t.replace(',', '.')) || 0)}
                onBlur={onBlur}
              />
            )}
          />
          {errors.superficie ? <Text style={styles.errTxt}>{String(errors.superficie.message)}</Text> : null}

          <Text style={styles.lab}>Description</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput style={[styles.inp, styles.ta]} value={value} onChangeText={onChange} onBlur={onBlur} multiline />
            )}
          />

          <View style={styles.footerBtns}>
            <Pressable onPress={onSubmitSingle} disabled={isSubmitting} style={[styles.btnPri, isSubmitting && styles.btnDis]}>
              <Text style={styles.btnPriTxt}>{isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la cage'}</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.btnSec}>
              <Text style={styles.btnSecTxt}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function createCageFormStyles(theme: ThemeColors) {
  return StyleSheet.create({
  scroll: { padding: theme.screenPadding, paddingBottom: 40 },
  segRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  seg: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radiusMd,
    backgroundColor: theme.surfaceHighlight,
    alignItems: 'center',
  },
  segOn: { backgroundColor: theme.surfaceElevated, borderWidth: 1, borderColor: theme.teal600 },
  segTxt: { fontWeight: '600', color: theme.slate600 },
  segTxtOn: { color: theme.teal900 },
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
  row2: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  rowGen: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radiusMd,
    borderWidth: 1,
    borderColor: theme.teal600,
    backgroundColor: theme.teal50,
  },
  genTxt: { fontWeight: '700', color: theme.teal800, fontSize: 14 },
  hint: { fontSize: 13, color: theme.slate600, marginBottom: 12, lineHeight: 18 },
  micro: { fontSize: 12, color: theme.slate500, marginTop: 4, marginBottom: 8 },
  preview: { marginTop: 12, padding: 12, borderRadius: theme.radiusMd, backgroundColor: theme.slate50, borderWidth: 1, borderColor: theme.border },
  previewWarn: { borderColor: '#fcd34d', backgroundColor: theme.amber50 },
  previewErr: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  previewTit: { fontWeight: '700', color: theme.slate800 },
  previewMono: { marginTop: 6, fontSize: 12, color: theme.slate700, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  previewWarntxt: { marginTop: 6, fontSize: 12, color: theme.amber950 },
  footerBtns: { marginTop: 20, gap: 10 },
  btnPri: { backgroundColor: theme.teal600, borderRadius: theme.radiusMd, paddingVertical: 14, alignItems: 'center' },
  btnPriTxt: { color: theme.white, fontWeight: '800', fontSize: 16 },
  btnSec: { borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusMd, paddingVertical: 12, alignItems: 'center' },
  btnSecTxt: { fontWeight: '700', color: theme.slate800 },
  btnDis: { opacity: 0.65 },
  errTxt: { color: theme.red600, fontSize: 12, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  err: { color: theme.red600, marginBottom: 12 },
  btnGhost: { marginTop: 12, padding: 12 },
  btnGhostTxt: { color: theme.teal700, fontWeight: '700' },
  });
}
