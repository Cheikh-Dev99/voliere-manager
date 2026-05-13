import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Timestamp } from 'firebase/firestore';
import { Sparkles } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { PIGEON_COULEURS_REFERENCE, PIGEON_RACES_REFERENCE } from '@shared/data/pigeonFormCatalog';
import { usePigeons } from '@shared/hooks/usePigeons';
import { creerPigeon, modifierPigeon, obtenirPigeon } from '@shared/services/pigeonsService';
import { proposerMatriculeSuivant } from '@shared/utils/pigeonMatricule';
import { PigeonSchema } from '@shared/validators/schemas';
import type { Pigeon, PigeonStatut } from '@shared/types';

import { theme } from '../../constants/theme';

const EditStatutSchema = z.enum(['ACTIF', 'VENDU', 'MORT', 'PERDU']);

type FormValues = {
  matricule: string;
  nom: string;
  sexe: 'MALE' | 'FEMALE';
  race: string;
  dateNaissance: string;
  couleur: string;
  pereId: string;
  mereId: string;
  notes: string;
  photo: string;
  statut: PigeonStatut;
};

const defaultValues: FormValues = {
  matricule: '',
  nom: '',
  sexe: 'MALE',
  race: '',
  dateNaissance: '',
  couleur: '',
  pereId: '',
  mereId: '',
  notes: '',
  photo: '',
  statut: 'ACTIF',
};

type ParentPick = 'pere' | 'mere' | null;

const RACE_CHIPS = PIGEON_RACES_REFERENCE.slice(0, 12);
const COULEUR_CHIPS = PIGEON_COULEURS_REFERENCE.slice(0, 16);

export function PigeonForm({ isEdit, pigeonId }: { isEdit: boolean; pigeonId?: string }) {
  const router = useRouter();
  const { pigeons, loading: loadList, males, femelles } = usePigeons(false);
  const [bootLoading, setBootLoading] = useState(isEdit);
  const [editNotFound, setEditNotFound] = useState(false);
  const [parentPick, setParentPick] = useState<ParentPick>(null);
  const createInitRef = useRef(false);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues });

  const sexe = watch('sexe');
  const pereIdVal = watch('pereId');
  const mereIdVal = watch('mereId');
  const statutVal = watch('statut');
  const matriculeVal = watch('matricule');
  const nomVal = watch('nom');
  const raceVal = watch('race');
  const dateNaissanceVal = watch('dateNaissance');
  const couleurVal = watch('couleur');
  const photoVal = watch('photo');
  const notesVal = watch('notes');

  const malesSelect = useMemo(
    () => males.filter((p) => !isEdit || p.id !== pigeonId),
    [males, isEdit, pigeonId],
  );
  const femellesSelect = useMemo(
    () => femelles.filter((p) => !isEdit || p.id !== pigeonId),
    [femelles, isEdit, pigeonId],
  );

  useEffect(() => {
    if (isEdit) return;
    if (loadList) return;
    if (createInitRef.current) return;
    createInitRef.current = true;
    reset({
      ...defaultValues,
      matricule: proposerMatriculeSuivant(pigeons),
    });
  }, [isEdit, loadList, pigeons, reset]);

  useEffect(() => {
    if (!isEdit) return;
    if (!pigeonId) return;
    let alive = true;
    (async () => {
      setBootLoading(true);
      setEditNotFound(false);
      try {
        const p = await obtenirPigeon(pigeonId);
        if (!alive) return;
        if (!p) {
          setEditNotFound(true);
          return;
        }
        reset({
          matricule: p.matricule,
          nom: p.nom,
          sexe: p.sexe,
          race: p.race,
          dateNaissance: p.dateNaissance?.toDate
            ? p.dateNaissance.toDate().toISOString().slice(0, 10)
            : '',
          couleur: p.couleur,
          pereId: p.pereId ?? '',
          mereId: p.mereId ?? '',
          notes: p.notes ?? '',
          photo: p.photo ?? '',
          statut: p.statut,
        });
      } finally {
        if (alive) setBootLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isEdit, pigeonId, reset]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      clearErrors();
      const pere = values.pereId?.trim() || null;
      const mere = values.mereId?.trim() || null;
      if (pere && mere && pere === mere) {
        setError('mereId', { type: 'manual', message: 'Père et mère doivent être distincts.' });
        return;
      }

      const base = {
        matricule: values.matricule.trim(),
        nom: values.nom.trim(),
        sexe: values.sexe,
        race: values.race.trim(),
        dateNaissance: values.dateNaissance,
        couleur: values.couleur.trim(),
        pereId: pere,
        mereId: mere,
        notes: (values.notes ?? '').trim(),
        photo: values.photo?.trim() || null,
      };

      const parsed = PigeonSchema.safeParse(base);
      if (!parsed.success) {
        const flat = parsed.error.flatten().fieldErrors;
        Object.entries(flat).forEach(([key, msgs]) => {
          const k = key as keyof FormValues;
          if (msgs?.[0]) setError(k, { type: 'manual', message: msgs[0] });
        });
        Alert.alert('Formulaire', 'Merci de corriger les champs indiqués.');
        return;
      }

      const dateNaissance = Timestamp.fromDate(new Date(`${parsed.data.dateNaissance}T12:00:00`));

      try {
        if (!isEdit) {
          const newId = await creerPigeon({
            ...parsed.data,
            dateNaissance,
            statut: 'ACTIF',
            photo: parsed.data.photo ?? null,
            pereId: parsed.data.pereId ?? null,
            mereId: parsed.data.mereId ?? null,
          });
          Alert.alert('Succès', 'Pigeon créé.', [
            { text: 'OK', onPress: () => router.replace(`/(app)/pigeon/${newId}`) },
          ]);
          return;
        }
        if (!pigeonId) return;
        const st = EditStatutSchema.safeParse(values.statut);
        if (!st.success) {
          Alert.alert('Erreur', 'Statut invalide.');
          return;
        }
        await modifierPigeon(pigeonId, {
          matricule: parsed.data.matricule,
          nom: parsed.data.nom,
          sexe: parsed.data.sexe,
          race: parsed.data.race,
          dateNaissance,
          couleur: parsed.data.couleur,
          pereId: parsed.data.pereId ?? null,
          mereId: parsed.data.mereId ?? null,
          notes: parsed.data.notes ?? '',
          photo: parsed.data.photo ?? null,
          statut: st.data,
        });
        Alert.alert('Succès', 'Pigeon mis à jour.', [
          { text: 'OK', onPress: () => router.replace(`/(app)/pigeon/${pigeonId}`) },
        ]);
      } catch (e) {
        Alert.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible');
      }
    },
    [clearErrors, isEdit, pigeonId, router, setError],
  );

  const onGenerateMatricule = useCallback(() => {
    setValue('matricule', proposerMatriculeSuivant(pigeons), { shouldDirty: true, shouldValidate: true });
    clearErrors('matricule');
  }, [clearErrors, pigeons, setValue]);

  const parentList = parentPick === 'pere' ? malesSelect : parentPick === 'mere' ? femellesSelect : [];
  const parentLabel = (id: string) => {
    const p = pigeons.find((x) => x.id === id);
    return p ? `${p.matricule} — ${p.nom}` : '—';
  };

  if (isEdit && bootLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.teal700} />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  if (!isEdit && loadList) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.teal700} />
        <Text style={styles.muted}>Chargement…</Text>
      </View>
    );
  }

  if (isEdit && editNotFound) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Pigeon introuvable.</Text>
        <Pressable onPress={() => router.back()} style={styles.btnGhost}>
          <Text style={styles.btnGhostTxt}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.h1}>{isEdit ? 'Modifier le pigeon' : 'Nouveau pigeon'}</Text>
      <Text style={styles.lead}>
        Parents : mâles et femelles actifs. Photo : URL https optionnelle (pas de stockage fichier local comme sur le web).
      </Text>

      <View style={styles.field}>
        <Text style={styles.lab}>Matricule *</Text>
        <View style={styles.rowGen}>
          <TextInput
            style={[styles.inp, styles.inpFlex, errors.matricule && styles.inpErr]}
            value={matriculeVal}
            onChangeText={(t) => setValue('matricule', t, { shouldValidate: true, shouldDirty: true })}
            autoCapitalize="characters"
          />
          <Pressable onPress={onGenerateMatricule} style={styles.genBtn} accessibilityLabel="Générer le matricule">
            <Sparkles size={18} color={theme.teal800} />
            <Text style={styles.genTxt}>Générer</Text>
          </Pressable>
        </View>
        {errors.matricule ? <Text style={styles.errTxt}>{errors.matricule.message}</Text> : null}
        <Text style={styles.micro}>Série P001, P002… selon les matricules déjà utilisés.</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Nom *</Text>
        <TextInput
          style={[styles.inp, errors.nom && styles.inpErr]}
          value={nomVal}
          onChangeText={(t) => setValue('nom', t, { shouldValidate: true, shouldDirty: true })}
        />
        {errors.nom ? <Text style={styles.errTxt}>{errors.nom.message}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Sexe *</Text>
        <View style={styles.rowSeg}>
          {(['MALE', 'FEMALE'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setValue('sexe', s, { shouldValidate: true, shouldDirty: true })}
              style={[styles.seg, sexe === s && styles.segOn]}
            >
              <Text style={[styles.segTxt, sexe === s && styles.segTxtOn]}>{s === 'MALE' ? 'Mâle' : 'Femelle'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Race *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {RACE_CHIPS.map((r) => (
            <Pressable key={r} style={styles.chip} onPress={() => setValue('race', r, { shouldDirty: true })}>
              <Text style={styles.chipTxt} numberOfLines={1}>
                {r.length > 22 ? `${r.slice(0, 20)}…` : r}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput
          style={[styles.inp, errors.race && styles.inpErr]}
          value={raceVal}
          onChangeText={(t) => setValue('race', t, { shouldValidate: true, shouldDirty: true })}
          placeholder="Ou saisie libre"
        />
        {errors.race ? <Text style={styles.errTxt}>{errors.race.message}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Date de naissance * (AAAA-MM-JJ)</Text>
        <TextInput
          style={[styles.inp, errors.dateNaissance && styles.inpErr]}
          value={dateNaissanceVal}
          onChangeText={(t) => setValue('dateNaissance', t, { shouldValidate: true, shouldDirty: true })}
          placeholder="2018-04-15"
        />
        {errors.dateNaissance ? <Text style={styles.errTxt}>{errors.dateNaissance.message}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Couleur *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {COULEUR_CHIPS.map((c) => (
            <Pressable key={c} style={styles.chip} onPress={() => setValue('couleur', c, { shouldDirty: true })}>
              <Text style={styles.chipTxt}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput
          style={[styles.inp, errors.couleur && styles.inpErr]}
          value={couleurVal}
          onChangeText={(t) => setValue('couleur', t, { shouldValidate: true, shouldDirty: true })}
        />
        {errors.couleur ? <Text style={styles.errTxt}>{errors.couleur.message}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Père (optionnel)</Text>
        <Pressable style={styles.pickBtn} onPress={() => setParentPick('pere')}>
          <Text style={styles.pickTxt}>{pereIdVal ? parentLabel(pereIdVal) : 'Choisir un mâle…'}</Text>
        </Pressable>
        {pereIdVal ? (
          <Pressable onPress={() => setValue('pereId', '')}>
            <Text style={styles.clear}>Effacer</Text>
          </Pressable>
        ) : null}
        {errors.pereId ? <Text style={styles.errTxt}>{errors.pereId.message}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Mère (optionnel)</Text>
        <Pressable style={styles.pickBtn} onPress={() => setParentPick('mere')}>
          <Text style={styles.pickTxt}>{mereIdVal ? parentLabel(mereIdVal) : 'Choisir une femelle…'}</Text>
        </Pressable>
        {mereIdVal ? (
          <Pressable onPress={() => setValue('mereId', '')}>
            <Text style={styles.clear}>Effacer</Text>
          </Pressable>
        ) : null}
        {errors.mereId ? <Text style={styles.errTxt}>{errors.mereId.message}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Photo (URL https optionnelle)</Text>
        <TextInput
          style={[styles.inp, errors.photo && styles.inpErr]}
          value={photoVal}
          onChangeText={(t) => setValue('photo', t, { shouldValidate: true, shouldDirty: true })}
          autoCapitalize="none"
        />
        {errors.photo ? <Text style={styles.errTxt}>{errors.photo.message}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Notes</Text>
        <TextInput
          style={[styles.inp, styles.multiline]}
          value={notesVal}
          onChangeText={(t) => setValue('notes', t, { shouldDirty: true })}
          multiline
        />
      </View>

      {isEdit ? (
        <View style={styles.field}>
          <Text style={styles.lab}>Statut</Text>
          <View style={styles.rowSeg}>
            {(['ACTIF', 'VENDU', 'MORT', 'PERDU'] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setValue('statut', s, { shouldDirty: true })}
                style={[styles.segSm, statutVal === s && styles.segOn]}
              >
                <Text style={[styles.segTxtSm, statutVal === s && styles.segTxtOn]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        style={[styles.submit, isSubmitting && { opacity: 0.7 }]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
      >
        <Text style={styles.submitTxt}>{isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}</Text>
      </Pressable>

      <Modal visible={parentPick !== null} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{parentPick === 'pere' ? 'Choisir le père' : 'Choisir la mère'}</Text>
            <FlatListSafe
              parentList={parentList}
              onPick={(id) => {
                if (parentPick === 'pere') setValue('pereId', id);
                else if (parentPick === 'mere') setValue('mereId', id);
                setParentPick(null);
              }}
              onClose={() => setParentPick(null)}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FlatListSafe({
  parentList,
  onPick,
  onClose,
}: {
  parentList: Pigeon[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <ScrollView style={{ maxHeight: 360 }}>
        {parentList.map((p) => (
          <Pressable key={p.id} style={styles.modalRow} onPress={() => onPick(p.id)}>
            <Text style={styles.modalRowTxt}>
              {p.matricule} — {p.nom}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable style={styles.modalClose} onPress={onClose}>
        <Text style={styles.modalCloseTxt}>Fermer</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 8, color: theme.slate500 },
  scroll: { padding: 16, paddingBottom: 48 },
  h1: { fontSize: 22, fontWeight: '800', color: theme.slate900 },
  lead: { fontSize: 14, color: theme.slate600, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  field: { marginBottom: 14 },
  lab: { fontSize: 13, fontWeight: '700', color: theme.slate700, marginBottom: 6 },
  inp: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
    backgroundColor: theme.white,
    color: theme.slate900,
  },
  inpFlex: { flex: 1 },
  rowGen: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.teal600,
    backgroundColor: theme.teal50,
  },
  genTxt: { fontWeight: '700', color: theme.teal800, fontSize: 14 },
  micro: { fontSize: 12, color: theme.slate500, marginTop: 6 },
  inpErr: { borderColor: theme.red600 },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  errTxt: { color: theme.red600, fontSize: 12, marginTop: 4 },
  err: { color: theme.red600, marginBottom: 8 },
  rowSeg: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seg: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.slate100,
    borderWidth: 1,
    borderColor: theme.border,
  },
  segSm: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.slate100,
    borderWidth: 1,
    borderColor: theme.border,
  },
  segOn: { backgroundColor: theme.teal100, borderColor: theme.teal600 },
  segTxt: { fontWeight: '700', color: theme.slate700 },
  segTxtSm: { fontWeight: '700', color: theme.slate700, fontSize: 12 },
  segTxtOn: { color: theme.teal900 },
  chipsScroll: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.teal100,
    marginRight: 8,
    maxWidth: 200,
  },
  chipTxt: { fontSize: 12, fontWeight: '600', color: theme.teal900 },
  pickBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 14,
    backgroundColor: theme.white,
  },
  pickTxt: { fontSize: 15, color: theme.teal800, fontWeight: '600' },
  clear: { marginTop: 6, color: theme.slate500, fontSize: 13 },
  submit: {
    marginTop: 20,
    backgroundColor: theme.teal600,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitTxt: { color: theme.white, fontWeight: '800', fontSize: 16 },
  btnGhost: { marginTop: 12, padding: 12 },
  btnGhostTxt: { color: theme.teal700, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: theme.slate900 },
  modalRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
  modalRowTxt: { fontSize: 16, color: theme.slate900 },
  modalClose: { marginTop: 12, padding: 14, alignItems: 'center' },
  modalCloseTxt: { color: theme.teal700, fontWeight: '800', fontSize: 16 },
});
