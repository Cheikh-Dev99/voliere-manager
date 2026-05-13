import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { CageSchema } from '@shared/validators/schemas'
import { useCages } from '@shared/hooks/useCages'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { creerCage, creerCagesLot, modifierCage, obtenirCage } from '@shared/services/cagesService'
import {
  buildNumerosRange,
  CAGE_LOT_MAX,
  proposerNumeroCageSuivant,
} from '@shared/utils/cageNumeroProposition'
import { mergeProfileVoliereCodesWithCages, VOLIERE_CODE_MAX_LEN } from '@shared/utils/voliereCodesMerge'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'
import useAuthStore from '../stores/authStore'

function fieldClass(err) {
  return `w-full rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 ${
    err ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500/30'
  }`
}

export function CageFormPage() {
  const authEmail = useAuthStore((s) => s.user?.email ?? '')
  const { profile } = useUserProfile(authEmail)
  const { cageId } = useParams()
  const isEdit = Boolean(cageId)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const voliereFromUrl = searchParams.get('voliere')?.trim() || 'A'

  const { cages } = useCages()

  const [loadingCage, setLoadingCage] = useState(isEdit)
  const [cageRemote, setCageRemote] = useState(null)

  const [mode, setMode] = useState(() => (searchParams.get('mode') === 'lot' ? 'lot' : 'single'))

  const [lotVoliere, setLotVoliere] = useState(voliereFromUrl)
  const [lotSuperficie, setLotSuperficie] = useState(0.5)
  const [lotDescription, setLotDescription] = useState('')
  const [lotPrefix, setLotPrefix] = useState('A')
  const [lotStart, setLotStart] = useState(1)
  const [lotEnd, setLotEnd] = useState(20)
  const [lotPad, setLotPad] = useState(2)
  const [lotNameTpl, setLotNameTpl] = useState('Cage {n}')
  const [lotSubmitting, setLotSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      numero: '',
      nom: '',
      superficie: 0.5,
      description: '',
      voliereCode: voliereFromUrl,
    },
  })

  function setModeTab(next) {
    setMode(next)
    if (!isEdit) {
      const nextParams = new URLSearchParams(searchParams)
      if (next === 'lot') nextParams.set('mode', 'lot')
      else nextParams.delete('mode')
      setSearchParams(nextParams, { replace: true })
    }
  }

  useEffect(() => {
    if (!isEdit) {
      reset((v) => ({ ...v, voliereCode: voliereFromUrl }))
      setLotVoliere(voliereFromUrl)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoadingCage(true)
      try {
        const c = await obtenirCage(cageId)
        if (cancelled) return
        setCageRemote(c)
        if (c) {
          reset({
            numero: c.numero ?? '',
            nom: c.nom ?? '',
            superficie: typeof c.superficie === 'number' ? c.superficie : 0.5,
            description: c.description ?? '',
            voliereCode: c.voliereCode ?? 'A',
          })
        }
      } finally {
        if (!cancelled) setLoadingCage(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isEdit, cageId, reset, voliereFromUrl])

  const title = useMemo(() => (isEdit ? 'Modifier la cage' : 'Nouvelle cage'), [isEdit])

  const voliereCodesFromCages = useMemo(
    () => mergeProfileVoliereCodesWithCages(profile?.voliereCodes, cages),
    [profile?.voliereCodes, cages],
  )

  const lotMergedOptions = useMemo(() => {
    const s = new Set(voliereCodesFromCages)
    const cur = lotVoliere.trim()
    if (cur) s.add(cur)
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
  }, [voliereCodesFromCages, lotVoliere])

  const lotVoliereUiValue = lotMergedOptions.includes(lotVoliere.trim()) ? lotVoliere.trim() : '__OTHER__'

  const lotPreview = useMemo(() => {
    const prefix = lotPrefix.trim() || 'A'
    const pad = Math.min(4, Math.max(1, Math.floor(Number(lotPad) || 2)))
    const lo = Math.floor(Number(lotStart) || 1)
    const hi = Math.floor(Number(lotEnd) || 1)
    const numeros = buildNumerosRange(prefix, lo, hi, pad)
    const count = numeros.length
    const existingKeys = new Set(
      cages.map((c) => `${c.voliereCode ?? 'A'}|${(c.numero ?? '').trim()}`),
    )
    const volCode = lotVoliere.trim() || 'A'
    const conflicts = numeros.filter((n) => existingKeys.has(`${volCode}|${n}`))
    const head = numeros.slice(0, 3)
    const tail = count > 6 ? numeros.slice(-2) : []
    return { numeros, count, conflicts, head, tail }
  }, [lotPrefix, lotStart, lotEnd, lotPad, lotVoliere, cages])

  async function onSubmit(values) {
    const parsed = CageSchema.safeParse({
      ...values,
      voliereCode: (values.voliereCode ?? '').trim() || 'A',
      superficie: Number(values.superficie),
    })
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      toast.error(first?.message || 'Données invalides')
      return
    }
    const data = parsed.data
    try {
      if (isEdit) {
        await modifierCage(cageId, data)
        toast.success('Cage mise à jour')
      } else {
        await creerCage(data)
        toast.success('Cage créée')
      }
      navigate('/cages')
    } catch (e) {
      toast.error(e?.message || 'Enregistrement impossible')
    }
  }

  async function onSubmitLot(e) {
    e.preventDefault()
    const { numeros, count, conflicts } = lotPreview
    if (count === 0) {
      toast.error('Indique une plage valide (du … au …).')
      return
    }
    if (count > CAGE_LOT_MAX) {
      toast.error(`Maximum ${CAGE_LOT_MAX} cages par envoi. Réduis la plage ou fais plusieurs lots.`)
      return
    }
    if (conflicts.length > 0) {
      toast.error(
        `Conflit avec des cages existantes : ${conflicts.slice(0, 5).join(', ')}${conflicts.length > 5 ? '…' : ''}`,
      )
      return
    }

    const volCode = lotVoliere.trim() || 'A'
    const sup = Number(lotSuperficie)
    const desc = (lotDescription ?? '').trim()

    const itemsPayload = []
    const loIdx = Math.min(Number(lotStart) || 1, Number(lotEnd) || 1)
    for (let idx = 0; idx < numeros.length; idx += 1) {
      const numero = numeros[idx]
      const i = loIdx + idx
      const nom = lotNameTpl
        .replace(/\{n\}/g, numero)
        .replace(/\{i\}/g, String(i))
      const raw = {
        voliereCode: volCode,
        numero,
        nom,
        superficie: sup,
        description: desc,
      }
      const parsed = CageSchema.safeParse(raw)
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? 'Données invalides')
        return
      }
      itemsPayload.push(parsed.data)
    }

    setLotSubmitting(true)
    try {
      const n = await creerCagesLot(itemsPayload)
      toast.success(`${n} cage${n > 1 ? 's' : ''} créée${n > 1 ? 's' : ''}`)
      navigate('/cages')
    } catch (err) {
      toast.error(err?.message || 'Création du lot impossible')
    } finally {
      setLotSubmitting(false)
    }
  }

  if (isEdit && loadingCage) {
    return <AppLoadingScreen variant="embedded" loadingContext="cages" message="Chargement de la cage…" />
  }

  if (isEdit && !loadingCage && !cageRemote) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <p>Cage introuvable ou accès refusé.</p>
        <Link to="/cages" className="mt-2 inline-block text-teal-800 underline">
          Retour à la liste des cages
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/cages" className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:underline">
          <ArrowLeft className="size-4" aria-hidden />
          Liste des cages
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>

      {!isEdit ? (
        <div className="flex rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setModeTab('single')}
            className={`flex min-h-[2.5rem] flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium transition ${
              mode === 'single'
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            Une cage
          </button>
          <button
            type="button"
            onClick={() => setModeTab('lot')}
            className={`flex min-h-[2.5rem] flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium transition ${
              mode === 'lot'
                ? 'bg-white text-teal-900 shadow-sm ring-1 ring-teal-200'
                : 'text-slate-600 hover:bg-white/70'
            }`}
          >
            Plusieurs cages (série)
          </button>
        </div>
      ) : null}

      {!isEdit && mode === 'lot' ? (
        <form
          onSubmit={onSubmitLot}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-slate-600">
            Même volière, superficie et description pour toutes les cages. Les numéros sont générés automatiquement
            (ex. A01 … A20). Placeholders du nom :{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{`{n}`}</code> = numéro complet,{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{`{i}`}</code> = indice numérique de la plage.
          </p>

          <div>
            <label htmlFor="lot-voliere" className="mb-1 block text-sm font-medium text-slate-700">
              Volière (nom court)
            </label>
            {lotMergedOptions.length === 0 ? (
              <input
                id="lot-voliere"
                value={lotVoliere}
                onChange={(e) => setLotVoliere(e.target.value)}
                className={fieldClass()}
                maxLength={VOLIERE_CODE_MAX_LEN}
                placeholder="Ex. A"
                autoComplete="off"
              />
            ) : (
              <>
                <select
                  id="lot-voliere"
                  value={lotVoliereUiValue === '__OTHER__' ? '__OTHER__' : lotVoliere.trim()}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '__OTHER__') setLotVoliere('')
                    else setLotVoliere(v)
                  }}
                  className={fieldClass()}
                >
                  {lotMergedOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                  <option value="__OTHER__">Autre code (saisie libre)</option>
                </select>
                {lotVoliereUiValue === '__OTHER__' ? (
                  <input
                    value={lotVoliere}
                    onChange={(e) => setLotVoliere(e.target.value)}
                    className={`mt-2 ${fieldClass()}`}
                    maxLength={VOLIERE_CODE_MAX_LEN}
                    placeholder="Ex. B, Nord…"
                    autoComplete="off"
                    aria-label="Nom court de la volière (saisie libre)"
                  />
                ) : null}
              </>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Liste des volières déjà présentes dans tes cages ; choisis « Autre » pour un nouveau code.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lot-prefix" className="mb-1 block text-sm font-medium text-slate-700">
                Préfixe du numéro
              </label>
              <input
                id="lot-prefix"
                value={lotPrefix}
                onChange={(e) => setLotPrefix(e.target.value)}
                className={fieldClass()}
                placeholder="A"
              />
            </div>
            <div>
              <label htmlFor="lot-pad" className="mb-1 block text-sm font-medium text-slate-700">
                Chiffres (padding)
              </label>
              <select
                id="lot-pad"
                value={lotPad}
                onChange={(e) => setLotPad(Number(e.target.value))}
                className={fieldClass()}
              >
                <option value={1}>1 — A1</option>
                <option value={2}>2 — A01</option>
                <option value={3}>3 — A001</option>
                <option value={4}>4 — A0001</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lot-start" className="mb-1 block text-sm font-medium text-slate-700">
                De
              </label>
              <input
                id="lot-start"
                type="number"
                min={1}
                value={lotStart}
                onChange={(e) => setLotStart(Number(e.target.value))}
                className={fieldClass()}
              />
            </div>
            <div>
              <label htmlFor="lot-end" className="mb-1 block text-sm font-medium text-slate-700">
                À
              </label>
              <input
                id="lot-end"
                type="number"
                min={1}
                value={lotEnd}
                onChange={(e) => setLotEnd(Number(e.target.value))}
                className={fieldClass()}
              />
            </div>
          </div>

          <div>
            <label htmlFor="lot-name" className="mb-1 block text-sm font-medium text-slate-700">
              Modèle du nom
            </label>
            <input
              id="lot-name"
              value={lotNameTpl}
              onChange={(e) => setLotNameTpl(e.target.value)}
              className={fieldClass()}
              placeholder="Cage {n}"
            />
          </div>

          <div>
            <label htmlFor="lot-sup" className="mb-1 block text-sm font-medium text-slate-700">
              Superficie (m²) — toutes les cages
            </label>
            <input
              id="lot-sup"
              type="number"
              step="0.1"
              min="0.1"
              value={lotSuperficie}
              onChange={(e) => setLotSuperficie(Number(e.target.value))}
              className={fieldClass()}
            />
          </div>

          <div>
            <label htmlFor="lot-desc" className="mb-1 block text-sm font-medium text-slate-700">
              Description (optionnelle)
            </label>
            <textarea
              id="lot-desc"
              rows={2}
              value={lotDescription}
              onChange={(e) => setLotDescription(e.target.value)}
              className={fieldClass()}
            />
          </div>

          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              lotPreview.count > CAGE_LOT_MAX
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : lotPreview.conflicts.length > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-950'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <p className="font-medium">
              Aperçu : {lotPreview.count} cage{lotPreview.count > 1 ? 's' : ''}
              {lotPreview.count > CAGE_LOT_MAX ? ` (max ${CAGE_LOT_MAX})` : ''}
            </p>
            {lotPreview.count > 0 && lotPreview.count <= CAGE_LOT_MAX ? (
              <p className="mt-1 font-mono text-xs">
                {lotPreview.head.join(', ')}
                {lotPreview.count > 6 ? ` … ${lotPreview.tail.join(', ')}` : lotPreview.count > 3 ? ` …` : ''}
              </p>
            ) : null}
            {lotPreview.conflicts.length > 0 ? (
              <p className="mt-2 text-xs">
                Conflit : numéro déjà utilisé pour cette volière —{' '}
                {lotPreview.conflicts.slice(0, 8).join(', ')}
                {lotPreview.conflicts.length > 8 ? '…' : ''}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={
                lotSubmitting ||
                lotPreview.count === 0 ||
                lotPreview.count > CAGE_LOT_MAX ||
                lotPreview.conflicts.length > 0
              }
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {lotSubmitting ? 'Création…' : `Créer ${lotPreview.count > 0 ? lotPreview.count : '…'} cage${lotPreview.count > 1 ? 's' : ''}`}
            </button>
            <Link
              to="/cages"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label htmlFor="voliere-select" className="mb-1 block text-sm font-medium text-slate-700">
              Volière (nom court)
            </label>
            <Controller
              name="voliereCode"
              control={control}
              render={({ field }) => {
                const vcTrim = (field.value ?? '').trim()
                const optSet = new Set(voliereCodesFromCages)
                if (vcTrim) optSet.add(vcTrim)
                const opts = Array.from(optSet).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
                const selUi = opts.includes(vcTrim) ? vcTrim : '__OTHER__'

                if (opts.length === 0) {
                  return (
                    <input
                      id="voliereCode"
                      {...field}
                      className={fieldClass(errors.voliereCode)}
                      maxLength={VOLIERE_CODE_MAX_LEN}
                      placeholder="Ex. A"
                      autoComplete="off"
                    />
                  )
                }

                return (
                  <>
                    <select
                      id="voliere-select"
                      className={fieldClass(errors.voliereCode)}
                      value={selUi === '__OTHER__' ? '__OTHER__' : vcTrim}
                      onChange={(e) => {
                        const v = e.target.value
                        if (v === '__OTHER__') field.onChange('')
                        else field.onChange(v)
                      }}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      aria-invalid={errors.voliereCode ? 'true' : 'false'}
                    >
                      {opts.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                      <option value="__OTHER__">Autre code (saisie libre)</option>
                    </select>
                    {selUi === '__OTHER__' ? (
                      <input
                        id="voliereCode-custom"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        className={`mt-2 ${fieldClass(errors.voliereCode)}`}
                        maxLength={VOLIERE_CODE_MAX_LEN}
                        placeholder="Ex. B, Nord…"
                        autoComplete="off"
                        aria-label="Nom court de la volière (saisie libre)"
                      />
                    ) : null}
                  </>
                )
              }}
            />
            {errors.voliereCode ? <p className="mt-1 text-xs text-red-600">{errors.voliereCode.message}</p> : null}
            <p className="mt-1 text-xs text-slate-500">
              Liste = volières déclarées dans ton profil (menu compte → Mes volières) + volières déjà présentes sur tes
              cages. « Autre » pour un nom court ponctuel. La visualisation regroupe les cages par volière.
            </p>
          </div>

          <div>
            <label htmlFor="numero" className="mb-1 block text-sm font-medium text-slate-700">
              Numéro de cage
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="numero"
                {...register('numero')}
                className={`min-w-0 flex-1 ${fieldClass(errors.numero)}`}
                placeholder="ex. A01"
                autoComplete="off"
              />
              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:w-auto sm:min-w-[10.5rem]"
                onClick={() => {
                  const volRaw = (getValues('voliereCode') ?? '').trim()
                  if (!volRaw) {
                    toast.error('Indique d’abord une volière (son nom court).')
                    return
                  }
                  const vol = volRaw
                  const next = proposerNumeroCageSuivant(vol, cages, isEdit ? cageId : undefined)
                  setValue('numero', next, { shouldValidate: true, shouldDirty: true })
                  clearErrors('numero')
                  toast.success(`Numéro proposé : ${next} (tu peux l’ajuster)`)
                }}
                aria-label="Générer un numéro de cage selon les cages déjà enregistrées pour cette volière"
              >
                <Sparkles className="size-4 shrink-0" aria-hidden />
                Générer
              </button>
            </div>
            {errors.numero ? <p className="mt-1 text-xs text-red-600">{errors.numero.message}</p> : null}
            <p id="numero-hint" className="mt-1 text-xs text-slate-500">
              Le bouton propose le prochain numéro libre pour la volière choisie (série du type{' '}
              <span className="font-mono text-slate-700">A01</span>, <span className="font-mono text-slate-700">A02</span>
              …).
            </p>
          </div>

          <div>
            <label htmlFor="nom" className="mb-1 block text-sm font-medium text-slate-700">
              Nom
            </label>
            <input id="nom" {...register('nom')} className={fieldClass(errors.nom)} />
            {errors.nom ? <p className="mt-1 text-xs text-red-600">{errors.nom.message}</p> : null}
          </div>

          <div>
            <label htmlFor="superficie" className="mb-1 block text-sm font-medium text-slate-700">
              Superficie (m²)
            </label>
            <input
              id="superficie"
              type="number"
              step="0.1"
              min="0.1"
              {...register('superficie', { valueAsNumber: true })}
              className={fieldClass(errors.superficie)}
            />
            {errors.superficie ? <p className="mt-1 text-xs text-red-600">{errors.superficie.message}</p> : null}
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea id="description" rows={3} {...register('description')} className={fieldClass(errors.description)} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la cage'}
            </button>
            <Link
              to="/cages"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
