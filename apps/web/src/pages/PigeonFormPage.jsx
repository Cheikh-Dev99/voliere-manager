import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Timestamp } from 'firebase/firestore'
import { ArrowLeft, ImagePlus, Sparkles, Upload } from 'lucide-react'
import { PIGEON_COULEURS_REFERENCE, PIGEON_RACES_REFERENCE } from '@shared/data/pigeonFormCatalog'
import { usePigeons } from '@shared/hooks/usePigeons'
import { creerPigeon, modifierPigeon } from '@shared/services/pigeonsService'
import { PigeonSchema } from '@shared/validators/schemas'
import { proposerMatriculeSuivant } from '@shared/utils/pigeonMatricule'
import { z } from 'zod'
import { CouleurCombobox } from '../components/CouleurCombobox'
import { SearchableCombobox } from '../components/SearchableCombobox'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'
import {
  clearDraftPigeonLocalPhoto,
  clearPigeonLocalPhoto,
  compressImageFileToDataUrl,
  loadDraftPigeonLocalPhoto,
  loadPigeonLocalPhoto,
  migrateDraftPigeonLocalPhoto,
  saveDraftPigeonLocalPhoto,
  savePigeonLocalPhoto,
} from '../utils/localPigeonPhoto'

const EditStatutSchema = z.enum(['ACTIF', 'VENDU', 'MORT', 'PERDU'])

const LS_CUSTOM_RACES = 'voliere-manager-custom-races'
const LS_CUSTOM_COULEURS = 'voliere-manager-custom-couleurs'

function readCustomList(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && x.trim()) : []
  } catch {
    return []
  }
}

/** Couleurs perso : `{ nom, hex }` (migration depuis l’ancien format chaîne). */
function readCustomCouleurs() {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_COULEURS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        if (typeof item === 'string' && item.trim()) {
          return { nom: item.trim(), hex: '#64748b' }
        }
        if (item && typeof item === 'object' && typeof item.nom === 'string' && item.nom.trim()) {
          const hex = typeof item.hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(item.hex) ? item.hex : '#64748b'
          return { nom: item.nom.trim(), hex }
        }
        return null
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function writeCustomList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* quota / mode privé */
  }
}

function mergeUniqueSorted(refList, extraList) {
  const set = new Set([...refList, ...extraList])
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
}

/** Aperçu : image locale (data URL) prioritaire, sinon URL distante. */
function PigeonPhotoThumb({ localSrc, url }) {
  const [broken, setBroken] = useState(false)
  const t = localSrc?.trim() || url?.trim()
  if (!t) return <ImagePlus className="size-10 text-slate-300" aria-hidden />
  if (broken) return <ImagePlus className="size-10 text-amber-300" aria-hidden title="Aperçu indisponible" />
  return (
    <img
      src={t}
      alt="Aperçu pigeon"
      className="max-h-full max-w-full object-contain"
      onError={() => setBroken(true)}
    />
  )
}

function fieldClass(err) {
  return `w-full rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 ${
    err ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500/30'
  }`
}

/**
 * Formulaire création / édition — sélecteurs parents, validation Zod inline.
 */
export function PigeonFormPage() {
  const { pigeonId } = useParams()
  const isEdit = Boolean(pigeonId)
  const navigate = useNavigate()
  const { pigeons, loading, males, femelles } = usePigeons(false)
  const photoFileInputRef = useRef(null)

  const [customRaces, setCustomRaces] = useState(() => readCustomList(LS_CUSTOM_RACES))
  const [customCouleurs, setCustomCouleurs] = useState(() => readCustomCouleurs())

  const pigeon = useMemo(
    () => (isEdit ? pigeons.find((p) => p.id === pigeonId) : null),
    [isEdit, pigeonId, pigeons],
  )

  const malesSelect = useMemo(
    () => males.filter((p) => !isEdit || p.id !== pigeonId),
    [males, isEdit, pigeonId],
  )
  const femellesSelect = useMemo(
    () => femelles.filter((p) => !isEdit || p.id !== pigeonId),
    [femelles, isEdit, pigeonId],
  )

  const allRaces = useMemo(() => mergeUniqueSorted(PIGEON_RACES_REFERENCE, customRaces), [customRaces])
  const allCouleurNoms = useMemo(() => {
    const set = new Set([...PIGEON_COULEURS_REFERENCE, ...customCouleurs.map((c) => c.nom)])
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  }, [customCouleurs])

  const addCustomRace = useCallback((t) => {
    const v = t.trim()
    if (!v) return
    setCustomRaces((prev) => {
      if (prev.some((p) => p.toLowerCase() === v.toLowerCase())) return prev
      const next = [...prev, v]
      writeCustomList(LS_CUSTOM_RACES, next)
      return next
    })
  }, [])

  const addCustomCouleur = useCallback((nom, hex) => {
    const n = nom.trim()
    if (!n) return
    const h = typeof hex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#64748b'
    setCustomCouleurs((prev) => {
      const filtered = prev.filter((p) => p.nom.toLowerCase() !== n.toLowerCase())
      const next = [...filtered, { nom: n, hex: h }]
      writeCustomList(LS_CUSTOM_COULEURS, next)
      return next
    })
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
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
    },
  })

  const photoUrl = useWatch({ control, name: 'photo' }) ?? ''
  /** Incrémenté après écriture / suppression en localStorage pour relire l’aperçu (évite setState dans un effect). */
  const [localPhotoRev, setLocalPhotoRev] = useState(0)
  const localPhotoDataUrl = useMemo(() => {
    if (!isEdit) return loadDraftPigeonLocalPhoto() || ''
    if (!pigeonId) return ''
    return loadPigeonLocalPhoto(pigeonId) || ''
    // eslint-disable-next-line react-hooks/exhaustive-deps -- localPhotoRev sert à relire LS après import / effacement
  }, [isEdit, pigeonId, localPhotoRev])

  useEffect(() => {
    if (!isEdit || !pigeon) return
    reset({
      matricule: pigeon.matricule,
      nom: pigeon.nom,
      sexe: pigeon.sexe,
      race: pigeon.race,
      dateNaissance: pigeon.dateNaissance?.toDate
        ? pigeon.dateNaissance.toDate().toISOString().slice(0, 10)
        : '',
      couleur: pigeon.couleur,
      pereId: pigeon.pereId ?? '',
      mereId: pigeon.mereId ?? '',
      notes: pigeon.notes ?? '',
      photo: pigeon.photo ?? '',
      statut: pigeon.statut,
    })
  }, [isEdit, pigeon, reset])

  const handlePhotoFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      const toastId = 'pigeon-photo-file'
      try {
        toast.loading('Traitement de l’image…', { id: toastId })
        const dataUrl = await compressImageFileToDataUrl(file)
        if (isEdit && pigeonId) {
          savePigeonLocalPhoto(pigeonId, dataUrl)
        } else {
          saveDraftPigeonLocalPhoto(dataUrl)
        }
        setLocalPhotoRev((n) => n + 1)
        toast.success('Photo enregistrée sur cet appareil (navigateur)', { id: toastId })
      } catch (err) {
        toast.error(err?.message || 'Impossible d’enregistrer la photo', { id: toastId })
      }
    },
    [isEdit, pigeonId],
  )

  const clearPhoto = useCallback(() => {
    setValue('photo', '', { shouldValidate: true, shouldDirty: true })
    clearErrors('photo')
    if (isEdit && pigeonId) clearPigeonLocalPhoto(pigeonId)
    else clearDraftPigeonLocalPhoto()
    setLocalPhotoRev((n) => n + 1)
  }, [clearErrors, isEdit, pigeonId, setValue])

  const onSubmit = async (values) => {
    clearErrors()

    const pere = values.pereId?.trim() || null
    const mere = values.mereId?.trim() || null
    if (pere && mere && pere === mere) {
      setError('mereId', { type: 'manual', message: 'Le père et la mère doivent être deux pigeons différents.' })
      toast.error('Vérifiez les parents indiqués.')
      return
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
    }

    const parsed = PigeonSchema.safeParse(base)
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      Object.entries(flat).forEach(([key, msgs]) => {
        if (msgs?.[0] && typeof key === 'string') {
          setError(key, { type: 'manual', message: msgs[0] })
        }
      })
      toast.error('Merci de corriger les champs indiqués.')
      return
    }

    const dateNaissance = Timestamp.fromDate(new Date(`${parsed.data.dateNaissance}T12:00:00`))

    try {
      if (!isEdit) {
        const newId = await creerPigeon({
          ...parsed.data,
          dateNaissance,
          statut: 'ACTIF',
          photo: parsed.data.photo ?? null,
          pereId: parsed.data.pereId ?? null,
          mereId: parsed.data.mereId ?? null,
        })
        migrateDraftPigeonLocalPhoto(newId)
        toast.success('Pigeon créé')
        navigate('/pigeons')
        return
      }

      const st = EditStatutSchema.safeParse(values.statut)
      if (!st.success) {
        toast.error('Statut invalide')
        return
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
      })
      toast.success('Pigeon mis à jour')
      navigate('/pigeons')
    } catch (e) {
      toast.error(e?.message || 'Enregistrement impossible')
    }
  }

  if (isEdit && !loading && !pigeon) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <p>Pigeon introuvable ou retiré de l’effectif.</p>
        <Link to="/pigeons" className="mt-2 inline-block text-teal-700 underline">
          Retour à la liste
        </Link>
      </div>
    )
  }

  if (isEdit && loading) {
    return (
      <AppLoadingScreen variant="embedded" message="Chargement du pigeon…" subtitle="Formulaire de modification." />
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link
          to="/pigeons"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour à la liste
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? 'Modifier le pigeon' : 'Nouveau pigeon'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Les parents se choisissent dans la liste des <strong>mâles</strong> et <strong>femelles actives</strong>{' '}
          (généalogie).
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="matricule" className="mb-1 block text-sm font-medium text-slate-700">
              Matricule (bague) *
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="matricule"
                autoComplete="off"
                className={`min-w-0 flex-1 ${fieldClass(errors.matricule)}`}
                aria-invalid={errors.matricule ? 'true' : 'false'}
                aria-describedby="matricule-hint"
                {...register('matricule', { required: 'Matricule requis' })}
              />
              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:w-auto sm:min-w-[10.5rem]"
                onClick={() => {
                  const next = proposerMatriculeSuivant(pigeons)
                  setValue('matricule', next, { shouldValidate: true, shouldDirty: true })
                  clearErrors('matricule')
                  toast.success(`Matricule proposé : ${next} (tu peux l’ajuster)`)
                }}
                aria-label="Générer un matricule au format P001, P002, comme dans le cahier des charges"
              >
                <Sparkles className="size-4 shrink-0" aria-hidden />
                Générer
              </button>
            </div>
            <p id="matricule-hint" className="mt-1 text-xs text-slate-500">
              Exemples : <span className="font-mono text-slate-700">P001</span>,{' '}
              <span className="font-mono text-slate-700">P002</span>, <span className="font-mono text-slate-700">P011</span>
              — le bouton propose le prochain numéro libre dans cette série.
            </p>
            {errors.matricule ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.matricule.message}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="nom" className="mb-1 block text-sm font-medium text-slate-700">
              Nom *
            </label>
            <input id="nom" className={fieldClass(errors.nom)} aria-invalid={errors.nom ? 'true' : 'false'} {...register('nom')} />
            {errors.nom ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.nom.message}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="sexe" className="mb-1 block text-sm font-medium text-slate-700">
              Sexe *
            </label>
            <select id="sexe" className={fieldClass(errors.sexe)} {...register('sexe')}>
              <option value="MALE">Mâle</option>
              <option value="FEMALE">Femelle</option>
            </select>
            {errors.sexe ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.sexe.message}
              </p>
            ) : null}
          </div>
          <Controller
            name="race"
            control={control}
            rules={{ required: 'Race requise', validate: (v) => (v?.trim() ? true : 'Race requise') }}
            render={({ field }) => (
              <SearchableCombobox
                id="race"
                label="Race"
                required
                options={allRaces}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.race?.message}
                onAddCustom={addCustomRace}
                hint="Liste indicative : recherche, choix ou ajout d’une race"
              />
            )}
          />
          <div>
            <label htmlFor="dateNaissance" className="mb-1 block text-sm font-medium text-slate-700">
              Date de naissance *
            </label>
            <input id="dateNaissance" type="date" className={fieldClass(errors.dateNaissance)} {...register('dateNaissance')} />
            {errors.dateNaissance ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.dateNaissance.message}
              </p>
            ) : null}
          </div>
          <Controller
            name="couleur"
            control={control}
            rules={{ required: 'Couleur requise', validate: (v) => (v?.trim() ? true : 'Couleur requise') }}
            render={({ field }) => (
              <CouleurCombobox
                id="couleur"
                label="Couleur"
                required
                optionsNoms={allCouleurNoms}
                customExtras={customCouleurs}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.couleur?.message}
                onAddCustom={addCustomCouleur}
                hint="Liste indicative : recherche, choix ou ajout d’une couleur + pipette pour sélectionner une couleur"
              />
            )}
          />
          {isEdit ? (
            <div>
              <label htmlFor="statut" className="mb-1 block text-sm font-medium text-slate-700">
                Statut *
              </label>
              <select id="statut" className={fieldClass(errors.statut)} {...register('statut')}>
                <option value="ACTIF">Actif</option>
                <option value="VENDU">Vendu</option>
                <option value="MORT">Mort</option>
                <option value="PERDU">Perdu</option>
              </select>
            </div>
          ) : null}

          <div className="sm:col-span-2 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
            <h2 className="text-sm font-semibold text-slate-800">Parents (optionnel)</h2>
            <p className="mt-0.5 text-xs text-slate-500">Uniquement les pigeons <strong>actifs</strong> ; ton pigeon actuel est exclu en modification.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pereId" className="mb-1 block text-sm font-medium text-slate-700">
                  Père
                </label>
                <select id="pereId" className={fieldClass(errors.pereId)} {...register('pereId')}>
                  <option value="">— Aucun —</option>
                  {malesSelect.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.matricule} — {m.nom}
                    </option>
                  ))}
                </select>
                {malesSelect.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">Aucun mâle actif : crée-en un d’abord ou laisse vide.</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="mereId" className="mb-1 block text-sm font-medium text-slate-700">
                  Mère
                </label>
                <select id="mereId" className={fieldClass(errors.mereId)} {...register('mereId')}>
                  <option value="">— Aucune —</option>
                  {femellesSelect.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.matricule} — {f.nom}
                    </option>
                  ))}
                </select>
                {errors.mereId ? (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {errors.mereId.message}
                  </p>
                ) : null}
                {femellesSelect.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">Aucune femelle active : crée-en une d’abord ou laisse vide.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Photo (optionnel)</span>
            <p className="mb-2 text-xs text-slate-500">
              Soit une <strong>URL publique</strong> (<span className="font-mono">https://…</span>) enregistrée dans
              Firestore, soit un <strong>fichier image</strong> depuis ton ordinateur : dans ce cas l’image est compressée
              puis stockée uniquement dans le <strong>localStorage</strong> de ce navigateur (invisible sur un autre
              appareil ou navigateur).
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-4">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <PigeonPhotoThumb
                    key={`thumb-${localPhotoRev}-${(photoUrl || '').slice(0, 48)}`}
                    localSrc={localPhotoDataUrl}
                    url={photoUrl}
                  />
                </div>
                <div className="flex w-full flex-1 flex-col gap-3">
                  <div>
                    <label htmlFor="photo" className="mb-1 block text-xs font-medium text-slate-600">
                      URL de la photo
                    </label>
                    <input
                      id="photo"
                      type="url"
                      inputMode="url"
                      placeholder="https://…"
                      className={fieldClass(errors.photo)}
                      aria-invalid={errors.photo ? 'true' : 'false'}
                      {...register('photo')}
                    />
                    {errors.photo ? (
                      <p className="mt-1 text-xs text-red-600" role="alert">
                        {errors.photo.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={photoFileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      aria-label="Choisir une image sur l’ordinateur"
                      onChange={handlePhotoFileChange}
                    />
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                      onClick={() => photoFileInputRef.current?.click()}
                    >
                      <Upload className="size-4 shrink-0" aria-hidden />
                      Choisir une image
                    </button>
                  </div>
                  {photoUrl?.trim() || localPhotoDataUrl ? (
                    <button
                      type="button"
                      className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      onClick={clearPhoto}
                    >
                      Retirer la photo (URL + fichier local)
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className={fieldClass(errors.notes)}
              placeholder="Signes distinctifs, origine, remarques…"
              aria-invalid={errors.notes ? 'true' : 'false'}
              {...register('notes')}
            />
            {errors.notes ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.notes.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Link
            to="/pigeons"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
