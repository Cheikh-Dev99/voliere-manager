import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Camera, Image as ImageIcon, Sparkles } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { usePigeons } from '@shared/hooks/usePigeons';
import { creerPigeon, modifierPigeon, obtenirPigeon } from '@shared/services/pigeonsService';
import { proposerMatriculeSuivant } from '@shared/utils/pigeonMatricule';
import { PigeonSchema } from '@shared/validators/schemas';
import type { Pigeon, PigeonStatut } from '@shared/types';

import { theme } from '../../constants/theme';
import { AppLoadingView } from '../ui/AppLoadingView';
import { PigeonBirthDatePicker } from './PigeonBirthDatePicker';
import { PigeonCouleurPicker } from './PigeonCouleurPicker';
import { PigeonRacePicker } from './PigeonRacePicker';
import {
  clearDraftPigeonLocalPhoto,
  clearPigeonLocalPhoto,
  compressPickerImageToJpegDataUrl,
  loadDraftPigeonLocalPhoto,
  loadPigeonLocalPhoto,
  migrateDraftPigeonLocalPhoto,
  saveDraftPigeonLocalPhoto,
  savePigeonLocalPhoto,
} from '../../utils/localPigeonPhoto';

import { appFeedback } from '../../lib/appFeedback';

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

export function PigeonForm({ isEdit, pigeonId }: { isEdit: boolean; pigeonId?: string }) {
  const router = useRouter();
  const { pigeons, loading: loadList, males, femelles } = usePigeons(false);
  const [bootLoading, setBootLoading] = useState(isEdit);
  const [editNotFound, setEditNotFound] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [localPhotoDataUrl, setLocalPhotoDataUrl] = useState<string | null>(null);
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

  useEffect(() => {
    if (isEdit && bootLoading) return;
    let alive = true;
    (async () => {
      if (isEdit && pigeonId) {
        const v = await loadPigeonLocalPhoto(pigeonId);
        if (alive) setLocalPhotoDataUrl(v);
      } else if (!isEdit) {
        const v = await loadDraftPigeonLocalPhoto();
        if (alive) setLocalPhotoDataUrl(v);
      } else {
        setLocalPhotoDataUrl(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isEdit, pigeonId, bootLoading]);

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
        appFeedback.alert('Formulaire', 'Merci de corriger les champs indiqués.');
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
          try {
            await migrateDraftPigeonLocalPhoto(newId);
          } catch (e) {
            appFeedback.alert(
              'Photo locale',
              e instanceof Error ? e.message : 'La fiche est créée mais la photo locale n’a pas pu être déplacée.',
            );
          }
          appFeedback.alert('Succès', 'Pigeon créé.', [
            { text: 'OK', onPress: () => router.replace(`/(app)/pigeon/${newId}`) },
          ]);
          return;
        }
        if (!pigeonId) return;
        const st = EditStatutSchema.safeParse(values.statut);
        if (!st.success) {
          appFeedback.alert('Erreur', 'Statut invalide.');
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
        appFeedback.alert('Succès', 'Pigeon mis à jour.', [
          { text: 'OK', onPress: () => router.replace(`/(app)/pigeon/${pigeonId}`) },
        ]);
      } catch (e) {
        appFeedback.alert('Erreur', e instanceof Error ? e.message : 'Enregistrement impossible');
      }
    },
    [clearErrors, isEdit, pigeonId, router, setError],
  );

  const onGenerateMatricule = useCallback(() => {
    setValue('matricule', proposerMatriculeSuivant(pigeons), { shouldDirty: true, shouldValidate: true });
    clearErrors('matricule');
  }, [clearErrors, pigeons, setValue]);

  const pickerOptions = useCallback((): ImagePicker.ImagePickerOptions => {
    const base: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    };
    if (Platform.OS === 'ios') {
      base.preferredAssetRepresentationMode =
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible;
    }
    return base;
  }, []);

  const processPickedAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      setPhotoBusy(true);
      try {
        const dataUrl = await compressPickerImageToJpegDataUrl(asset.uri);
        if (isEdit && pigeonId) {
          await savePigeonLocalPhoto(pigeonId, dataUrl);
        } else {
          await saveDraftPigeonLocalPhoto(dataUrl);
        }
        setLocalPhotoDataUrl(dataUrl);
      } catch (e) {
        appFeedback.alert('Photo', e instanceof Error ? e.message : 'Enregistrement local impossible');
      } finally {
        setPhotoBusy(false);
      }
    },
    [isEdit, pigeonId],
  );

  const onPickFromLibrary = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      appFeedback.alert('Photos', 'L’accès à la galerie est nécessaire pour choisir une image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions());
    if (result.canceled || !result.assets[0]) return;
    await processPickedAsset(result.assets[0]);
  }, [pickerOptions, processPickedAsset]);

  const onPickFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      appFeedback.alert('Caméra', 'L’accès à la caméra est nécessaire pour prendre une photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(pickerOptions());
    if (result.canceled || !result.assets[0]) return;
    await processPickedAsset(result.assets[0]);
  }, [pickerOptions, processPickedAsset]);

  const onClearPhoto = useCallback(async () => {
    try {
      if (isEdit && pigeonId) await clearPigeonLocalPhoto(pigeonId);
      else await clearDraftPigeonLocalPhoto();
    } catch {
      /* ignore */
    }
    setLocalPhotoDataUrl(null);
    setValue('photo', '', { shouldValidate: true, shouldDirty: true });
    clearErrors('photo');
  }, [clearErrors, isEdit, pigeonId, setValue]);

  const photoPreviewUri = useMemo(() => {
    if (localPhotoDataUrl?.trim()) return localPhotoDataUrl.trim();
    const u = photoVal?.trim();
    if (u && /^https?:\/\//i.test(u)) return u;
    return null;
  }, [localPhotoDataUrl, photoVal]);

  const parentList = parentPick === 'pere' ? malesSelect : parentPick === 'mere' ? femellesSelect : [];
  const parentLabel = (id: string) => {
    const p = pigeons.find((x) => x.id === id);
    return p ? `${p.matricule} — ${p.nom}` : '—';
  };

  if (isEdit && bootLoading) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="default"
          message="Chargement du pigeon…"
          subtitle="Formulaire d’édition."
        />
      </View>
    );
  }

  if (!isEdit && loadList) {
    return (
      <View style={styles.center}>
        <AppLoadingView
          variant="embedded"
          loadingContext="default"
          message="Chargement…"
          subtitle="Liste des pigeons pour le formulaire."
        />
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
        Parents : mâles et femelles actifs. Photo depuis l’appareil : stockée en local sur ce téléphone (AsyncStorage,
        comme le localStorage sur le web), ou URL https optionnelle synchronisée avec Firestore.
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
        <PigeonRacePicker
          value={raceVal}
          onChange={(t) => setValue('race', t, { shouldValidate: true, shouldDirty: true })}
          error={errors.race?.message}
          onClearError={() => clearErrors('race')}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Date de naissance *</Text>
        <PigeonBirthDatePicker
          value={dateNaissanceVal}
          onChange={(t) => setValue('dateNaissance', t, { shouldValidate: true, shouldDirty: true })}
          error={errors.dateNaissance?.message}
          onClearError={() => clearErrors('dateNaissance')}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.lab}>Couleur *</Text>
        <PigeonCouleurPicker
          value={couleurVal}
          onChange={(t) => setValue('couleur', t, { shouldValidate: true, shouldDirty: true })}
          error={errors.couleur?.message}
          onClearError={() => clearErrors('couleur')}
        />
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
        <Text style={styles.lab}>Photo (optionnel)</Text>
        <Text style={styles.micro}>
          Galerie ou caméra : image compressée en JPEG et enregistrée uniquement sur cet appareil (invisible sur un
          autre téléphone). Une URL https, si tu en saisis une, est enregistrée dans Firestore.
        </Text>
        <View style={styles.photoRow}>
          <View style={styles.photoThumbWrap}>
            {photoBusy ? (
              <View style={[styles.photoThumb, styles.photoThumbCenter]}>
                <ActivityIndicator color={theme.teal700} />
              </View>
            ) : photoPreviewUri ? (
              <Image
                source={{ uri: photoPreviewUri }}
                style={styles.photoThumb}
                accessibilityIgnoresInvertColors
                accessibilityLabel="Aperçu photo pigeon"
              />
            ) : (
              <View style={[styles.photoThumb, styles.photoThumbPh]}>
                <Text style={styles.photoThumbPhTxt}>Aperçu</Text>
              </View>
            )}
          </View>
          <View style={styles.photoActions}>
            <Pressable
              style={[styles.photoBtn, photoBusy && styles.photoBtnDisabled]}
              onPress={onPickFromLibrary}
              disabled={photoBusy}
              accessibilityLabel="Choisir une image dans la galerie"
            >
              <ImageIcon size={18} color={theme.teal800} />
              <Text style={styles.photoBtnTxt}>Galerie</Text>
            </Pressable>
            <Pressable
              style={[styles.photoBtn, photoBusy && styles.photoBtnDisabled]}
              onPress={onPickFromCamera}
              disabled={photoBusy}
              accessibilityLabel="Prendre une photo avec la caméra"
            >
              <Camera size={18} color={theme.teal800} />
              <Text style={styles.photoBtnTxt}>Caméra</Text>
            </Pressable>
            {photoPreviewUri ? (
              <Pressable onPress={() => void onClearPhoto()} disabled={photoBusy} style={styles.photoClearWrap}>
                <Text style={styles.photoClearTxt}>Retirer la photo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text style={[styles.micro, { marginTop: 10 }]}>URL de la photo (alternative)</Text>
        <TextInput
          style={[styles.inp, errors.photo && styles.inpErr]}
          value={photoVal}
          onChangeText={(t) => setValue('photo', t, { shouldValidate: true, shouldDirty: true })}
          autoCapitalize="none"
          placeholder="https://…"
          editable={!photoBusy}
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
        style={[styles.submit, (isSubmitting || photoBusy) && { opacity: 0.7 }]}
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting || photoBusy}
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
  photoRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginTop: 10 },
  photoThumbWrap: { flexShrink: 0 },
  photoThumb: {
    width: 96,
    height: 96,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.white,
  },
  photoThumbCenter: { justifyContent: 'center', alignItems: 'center' },
  photoThumbPh: { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.slate100 },
  photoThumbPhTxt: { fontSize: 12, color: theme.slate500, fontWeight: '600' },
  photoActions: { flex: 1, gap: 8, minWidth: 0 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.teal600,
    backgroundColor: theme.teal50,
  },
  photoBtnDisabled: { opacity: 0.55 },
  photoBtnTxt: { fontWeight: '700', color: theme.teal800, fontSize: 14 },
  photoClearWrap: { paddingVertical: 4 },
  photoClearTxt: { fontSize: 13, color: theme.slate500, fontWeight: '600' },
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
