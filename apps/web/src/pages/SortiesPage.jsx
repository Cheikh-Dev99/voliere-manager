import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  ArrowDownNarrowWide,
  ArrowLeft,
  ArrowUpNarrowWide,
  ClipboardList,
  FilterX,
  Info,
  Search,
} from 'lucide-react'
import { usePigeons } from '@shared/hooks/usePigeons'
import { useCages } from '@shared/hooks/useCages'
import { useCouples } from '@shared/hooks/useCouples'
import { useSorties } from '@shared/hooks/useSorties'
import { enregistrerSortie } from '@shared/services/pigeonsService'
import { SortieSchema } from '@shared/validators/schemas'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'

const TYPE_OPTIONS = [
  { value: 'VENTE', label: 'Vente', hint: 'Statut pigeon → Vendu' },
  { value: 'DECES', label: 'Décès', hint: 'Statut pigeon → Mort' },
  { value: 'PERTE', label: 'Perte', hint: 'Statut pigeon → Perdu' },
]

const TYPE_BADGE = {
  VENTE: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  DECES: 'border-slate-300 bg-slate-100 text-slate-800',
  PERTE: 'border-amber-200 bg-amber-50 text-amber-950',
}

const SORTIES_BACK = { path: '/sorties', label: 'Retour aux sorties' }

const LS_SORTIES_PREFS = 'voliere-manager:sorties-list-prefs'

function readSortiesPrefs() {
  try {
    const raw = localStorage.getItem(LS_SORTIES_PREFS)
    if (!raw) return { sortBy: 'date', sortDir: 'desc' }
    const o = JSON.parse(raw)
    return {
      sortBy: ['date', 'matricule', 'type'].includes(o.sortBy) ? o.sortBy : 'date',
      sortDir: o.sortDir === 'asc' ? 'asc' : 'desc',
    }
  } catch {
    return { sortBy: 'date', sortDir: 'desc' }
  }
}

function writeSortiesPrefs(prefs) {
  try {
    localStorage.setItem(LS_SORTIES_PREFS, JSON.stringify(prefs))
  } catch {
    /* quota */
  }
}

function fieldClass(err) {
  return `w-full rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 ${
    err ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500/30'
  }`
}

function formatTs(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  try {
    return ts.toDate().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function sortieDateMs(s) {
  try {
    return s.date?.toDate?.()?.getTime?.() ?? 0
  } catch {
    return 0
  }
}

function matriculeSortie(s, pigeonById) {
  return (s.pigeonMatricule ?? pigeonById.get(s.pigeonId)?.matricule ?? '').toLowerCase()
}

function compareSorties(a, b, sortBy, sortDir, pigeonById) {
  const dir = sortDir === 'desc' ? -1 : 1
  let cmp
  switch (sortBy) {
    case 'matricule':
      cmp = matriculeSortie(a, pigeonById).localeCompare(matriculeSortie(b, pigeonById), 'fr', {
        numeric: true,
      })
      break
    case 'type':
      cmp = a.type.localeCompare(b.type)
      break
    default:
      cmp = sortieDateMs(a) - sortieDateMs(b)
  }
  if (cmp !== 0) return cmp * dir
  return sortieDateMs(b) - sortieDateMs(a)
}

/** Recherche sur matricule, nom pigeon, acheteur, cause, circonstances, notes, cages, conjoint. */
function sortieMatchesQuery(s, qNorm, pigeonById, cageById) {
  if (!qNorm) return true
  const p = pigeonById.get(s.pigeonId)
  const bits = [
    s.pigeonMatricule ?? '',
    p?.matricule ?? '',
    p?.nom ?? '',
    s.acheteur ?? '',
    s.cause ?? '',
    s.circonstance ?? '',
    s.notes ?? '',
    s.type,
  ]
  if (s.cageSoloIdLiberee) {
    const c = cageById.get(s.cageSoloIdLiberee)
    bits.push(c?.numero ?? '', c?.nom ?? '', s.cageSoloIdLiberee)
  }
  if (s.cageCoupleIdLiberee) {
    const c = cageById.get(s.cageCoupleIdLiberee)
    bits.push(c?.numero ?? '', c?.nom ?? '', s.cageCoupleIdLiberee)
  }
  if (s.conjointPigeonId) {
    const co = pigeonById.get(s.conjointPigeonId)
    bits.push(co?.matricule ?? '', co?.nom ?? '', s.conjointPigeonId)
  }
  const hay = bits.join(' ').toLowerCase()
  return hay.includes(qNorm)
}

function startOfYearMs(d) {
  return new Date(d.getFullYear(), 0, 1).getTime()
}

/**
 * Sorties — vente / décès / perte avec cascade métier (cage, couple, document Sortie).
 */
export function SortiesPage() {
  const [searchParams] = useSearchParams()
  const pigeonParam = searchParams.get('pigeon')

  const { pigeons, pigeonsActifs, loading: loadPigeons } = usePigeons(false)
  const { cages, loading: loadCages } = useCages()
  const { couples, loading: loadCouples } = useCouples(false)
  const { sorties, loading: loadSorties, error: sortiesError, stats } = useSorties()

  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [filterImpact, setFilterImpact] = useState('ALL')
  const [filterPeriod, setFilterPeriod] = useState('')
  const [pigeonSelectQuery, setPigeonSelectQuery] = useState('')
  const [sortBy, setSortBy] = useState(() => readSortiesPrefs().sortBy)
  const [sortDir, setSortDir] = useState(() => readSortiesPrefs().sortDir)

  const pigeonsActifsSorted = useMemo(
    () => [...pigeonsActifs].sort((a, b) => a.matricule.localeCompare(b.matricule, 'fr', { numeric: true })),
    [pigeonsActifs],
  )

  const pigeonsForSelect = useMemo(() => {
    const q = pigeonSelectQuery.trim().toLowerCase()
    if (!q) return pigeonsActifsSorted
    return pigeonsActifsSorted.filter(
      (p) =>
        p.matricule.toLowerCase().includes(q) ||
        p.nom.toLowerCase().includes(q) ||
        p.race.toLowerCase().includes(q),
    )
  }, [pigeonsActifsSorted, pigeonSelectQuery])

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
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
  })

  const pigeonId = useWatch({ control, name: 'pigeonId' }) ?? ''
  const typeSortie = useWatch({ control, name: 'type' }) ?? 'VENTE'

  useEffect(() => {
    if (!pigeonParam || loadPigeons) return
    const ok = pigeonsActifs.some((p) => p.id === pigeonParam)
    if (ok) setValue('pigeonId', pigeonParam)
  }, [pigeonParam, pigeonsActifs, loadPigeons, setValue])

  const contexte = useMemo(() => {
    if (!pigeonId) return null
    const pigeon = pigeons.find((p) => p.id === pigeonId)
    if (!pigeon) return null

    const cageSolo = cages.find(
      (c) => c.pigeonId === pigeonId && c.statut === 'OCCUPE_PIGEON',
    )
    const couple = couples.find(
      (c) => c.statut === 'ACTIF' && (c.maleId === pigeonId || c.femelleId === pigeonId),
    )
    const cageCouple =
      couple?.cageId != null ? cages.find((c) => c.id === couple.cageId) : null
    const conjointId = couple
      ? couple.maleId === pigeonId
        ? couple.femelleId
        : couple.maleId
      : null
    const conjoint = conjointId ? pigeons.find((p) => p.id === conjointId) : null

    return { pigeon, cageSolo, couple, cageCouple, conjoint }
  }, [pigeonId, pigeons, cages, couples])

  const pigeonById = useMemo(() => new Map(pigeons.map((p) => [p.id, p])), [pigeons])
  const cageById = useMemo(() => new Map(cages.map((c) => [c.id, c])), [cages])

  const persistSort = useCallback((next) => {
    writeSortiesPrefs(next)
  }, [])

  const setSortByAndSave = useCallback(
    (field) => {
      setSortBy(field)
      persistSort({ sortBy: field, sortDir })
    },
    [persistSort, sortDir],
  )

  const toggleSortDirAndSave = useCallback(() => {
    setSortDir((d) => {
      const next = d === 'asc' ? 'desc' : 'asc'
      persistSort({ sortBy, sortDir: next })
      return next
    })
  }, [persistSort, sortBy])

  const [filterAnchorMs] = useState(() => Date.now())

  const filteredSorties = useMemo(() => {
    const qNorm = query.trim().toLowerCase()
    let rows = sorties.filter((s) => {
      if (filterType !== 'ALL' && s.type !== filterType) return false
      if (filterImpact === 'CAGE' && !s.cageSoloIdLiberee && !s.cageCoupleIdLiberee) return false
      if (filterImpact === 'COUPLE' && !s.coupleRompuId) return false
      if (filterPeriod) {
        const t = sortieDateMs(s)
        if (filterPeriod === '30d' && t < filterAnchorMs - 30 * 86400000) return false
        if (filterPeriod === '90d' && t < filterAnchorMs - 90 * 86400000) return false
        if (filterPeriod === 'ytd' && t < startOfYearMs(new Date(filterAnchorMs))) return false
      }
      return sortieMatchesQuery(s, qNorm, pigeonById, cageById)
    })
    rows = [...rows].sort((a, b) => compareSorties(a, b, sortBy, sortDir, pigeonById))
    return rows
  }, [
    sorties,
    query,
    filterType,
    filterImpact,
    filterPeriod,
    sortBy,
    sortDir,
    pigeonById,
    cageById,
    filterAnchorMs,
  ])

  const hasActiveFilters = Boolean(
    query.trim() ||
      filterType !== 'ALL' ||
      filterImpact !== 'ALL' ||
      filterPeriod ||
      sortBy !== 'date' ||
      sortDir !== 'desc',
  )

  const resetFilters = useCallback(() => {
    setQuery('')
    setFilterType('ALL')
    setFilterImpact('ALL')
    setFilterPeriod('')
    setSortBy('date')
    setSortDir('desc')
    writeSortiesPrefs({ sortBy: 'date', sortDir: 'desc' })
  }, [])

  const setTypeFilterFromChip = useCallback((t) => {
    setFilterType((prev) => (prev === t ? 'ALL' : t))
  }, [])

  const onSubmit = async (values) => {
    clearErrors()
    const notes = (values.notes ?? '').trim()
    const dateStr = values.date

    let parsed
    if (values.type === 'VENTE') {
      const prixNum = values.prix === '' || values.prix == null ? NaN : Number(values.prix)
      parsed = SortieSchema.safeParse({
        type: 'VENTE',
        pigeonId: values.pigeonId?.trim() || '',
        date: dateStr,
        prix: prixNum,
        acheteur: (values.acheteur ?? '').trim(),
        notes,
      })
    } else if (values.type === 'DECES') {
      parsed = SortieSchema.safeParse({
        type: 'DECES',
        pigeonId: values.pigeonId?.trim() || '',
        date: dateStr,
        cause: (values.cause ?? '').trim(),
        notes,
      })
    } else {
      parsed = SortieSchema.safeParse({
        type: 'PERTE',
        pigeonId: values.pigeonId?.trim() || '',
        date: dateStr,
        circonstance: (values.circonstance ?? '').trim(),
        notes,
      })
    }

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

    const d = parsed.data
    const dateObj = new Date(`${d.date}T12:00:00`)

    try {
      await enregistrerSortie({
        pigeonId: d.pigeonId,
        type: d.type,
        date: dateObj,
        prix: d.type === 'VENTE' ? d.prix : null,
        acheteur: d.type === 'VENTE' ? d.acheteur : null,
        cause: d.type === 'DECES' ? (d.cause?.trim() ? d.cause.trim() : null) : null,
        circonstance:
          d.type === 'PERTE' ? (d.circonstance?.trim() ? d.circonstance.trim() : null) : null,
        notes: d.notes ?? '',
      })
      toast.success('Sortie enregistrée — pigeon, cages et couple mis à jour.')
      reset({
        pigeonId: '',
        type: values.type,
        date: new Date().toISOString().slice(0, 10),
        prix: '',
        acheteur: '',
        cause: '',
        circonstance: '',
        notes: '',
      })
    } catch (e) {
      toast.error(e?.message || 'Enregistrement impossible')
    }
  }

  const loading = loadPigeons || loadCages || loadCouples

  if (loading) {
    return (
      <AppLoadingScreen variant="embedded" loadingContext="sorties" message="Chargement de la page sorties…" subtitle="Pigeons, cages et couples." />
    )
  }

  const selectedNotInFiltered =
    Boolean(pigeonId) && !pigeonsForSelect.some((p) => p.id === pigeonId)
  const selectedPigeonRow = pigeonId
    ? pigeonsActifsSorted.find((p) => p.id === pigeonId) ?? pigeons.find((p) => p.id === pigeonId)
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            to="/"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Visualisation
          </Link>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <ClipboardList className="size-8 shrink-0 text-teal-600" aria-hidden />
            Sorties
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Enregistre une <strong>vente</strong>, un <strong>décès</strong> ou une <strong>perte</strong>. Le pigeon
            passe au statut correspondant, une <strong>cage</strong> occupée par lui seul est libérée, un{' '}
            <strong>couple actif</strong> le concernant est rompu avec libération de la cage du couple, et un document{' '}
            <strong>Sortie</strong> est créé pour l’historique.
          </p>
          {!loadSorties && sorties.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500" aria-live="polite">
              <span className="font-medium text-slate-700">{stats.total}</span> sortie(s) en base
              {hasActiveFilters ? (
                <>
                  {' '}
                  · <span className="text-teal-800">{filteredSorties.length}</span> affichée(s) après filtres
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <Link
          to="/pigeons"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Liste des pigeons
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <h2 className="text-lg font-semibold text-slate-900">Nouvelle sortie</h2>

          <div>
            <label htmlFor="sortie-pigeon-filter" className="mb-1 block text-sm font-medium text-slate-700">
              Filtrer la liste
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="sortie-pigeon-filter"
                type="search"
                value={pigeonSelectQuery}
                onChange={(e) => setPigeonSelectQuery(e.target.value)}
                placeholder="Matricule, nom ou race…"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                aria-label="Filtrer les pigeons actifs dans la liste déroulante"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sortie-pigeon" className="mb-1 block text-sm font-medium text-slate-700">
              Pigeon concerné <span className="text-red-600">*</span>
            </label>
            <select
              id="sortie-pigeon"
              {...register('pigeonId', { required: 'Choisis un pigeon' })}
              className={fieldClass(errors.pigeonId)}
            >
              <option value="">— Sélectionner un pigeon actif —</option>
              {selectedNotInFiltered && selectedPigeonRow ? (
                <option key={`pinned-${selectedPigeonRow.id}`} value={selectedPigeonRow.id}>
                  {selectedPigeonRow.matricule} — {selectedPigeonRow.nom} (sélection actuelle — vide le filtre pour
                  parcourir la liste)
                </option>
              ) : null}
              {pigeonsForSelect.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.matricule} — {p.nom} ({p.sexe === 'MALE' ? 'Mâle' : 'Femelle'})
                </option>
              ))}
            </select>
            {errors.pigeonId ? (
              <p className="mt-1 text-xs text-red-600">{errors.pigeonId.message}</p>
            ) : null}
            {pigeonsActifsSorted.length === 0 ? (
              <p className="mt-2 text-xs text-amber-800">
                Aucun pigeon actif :{' '}
                <Link to="/pigeons" className="font-medium underline hover:text-amber-950">
                  voir la liste
                </Link>{' '}
                ou réactive un pigeon avant d’enregistrer une sortie.
              </p>
            ) : null}
          </div>

          {contexte ? (
            <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50/80 to-white px-4 py-3 text-sm text-slate-700">
              <p className="flex items-center gap-2 font-medium text-teal-900">
                <Info className="size-4 shrink-0" aria-hidden />
                Contexte avant enregistrement
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-slate-600">
                <li>
                  Pigeon :{' '}
                  <span className="font-mono font-medium text-slate-800">{contexte.pigeon.matricule}</span>
                </li>
                {contexte.cageSolo ? (
                  <li>
                    Cage (pigeon seul) :{' '}
                    <strong>
                      {contexte.cageSolo.numero}
                      {contexte.cageSolo.nom ? ` — ${contexte.cageSolo.nom}` : ''}
                    </strong>{' '}
                    → sera libérée
                  </li>
                ) : (
                  <li>Aucune cage en occupation « pigeon seul » pour ce matricule.</li>
                )}
                {contexte.couple ? (
                  <>
                    <li>
                      Couple actif : ce pigeon est apparié → le couple sera <strong>rompu</strong>
                      {contexte.conjoint ? (
                        <>
                          {' '}
                          (conjoint :{' '}
                          <span className="font-mono">{contexte.conjoint.matricule}</span> reste actif)
                        </>
                      ) : null}
                    </li>
                    {contexte.cageCouple ? (
                      <li>
                        Cage du couple :{' '}
                        <strong>
                          {contexte.cageCouple.numero}
                          {contexte.cageCouple.nom ? ` — ${contexte.cageCouple.nom}` : ''}
                        </strong>{' '}
                        → sera libérée
                      </li>
                    ) : (
                      <li>Ce couple n’a pas de cage assignée en base.</li>
                    )}
                  </>
                ) : (
                  <li>Ce pigeon n’est dans aucun couple actif.</li>
                )}
              </ul>
            </div>
          ) : null}

          <fieldset>
            <legend className="mb-2 block text-sm font-medium text-slate-700">Type de sortie</legend>
            <div className="flex flex-col gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                    typeSortie === opt.value
                      ? 'border-teal-400 bg-teal-50/60 ring-1 ring-teal-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    className="mt-0.5 text-teal-600"
                    {...register('type')}
                  />
                  <span>
                    <span className="font-medium text-slate-900">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="sortie-date" className="mb-1 block text-sm font-medium text-slate-700">
              Date de la sortie <span className="text-red-600">*</span>
            </label>
            <input id="sortie-date" type="date" {...register('date')} className={fieldClass(errors.date)} />
            {errors.date ? <p className="mt-1 text-xs text-red-600">{errors.date.message}</p> : null}
          </div>

          {typeSortie === 'VENTE' ? (
            <>
              <div>
                <label htmlFor="sortie-prix" className="mb-1 block text-sm font-medium text-slate-700">
                  Prix <span className="text-red-600">*</span>
                </label>
                <input
                  id="sortie-prix"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  {...register('prix')}
                  className={fieldClass(errors.prix)}
                />
                {errors.prix ? <p className="mt-1 text-xs text-red-600">{errors.prix.message}</p> : null}
              </div>
              <div>
                <label htmlFor="sortie-acheteur" className="mb-1 block text-sm font-medium text-slate-700">
                  Acheteur <span className="text-red-600">*</span>
                </label>
                <input
                  id="sortie-acheteur"
                  type="text"
                  autoComplete="off"
                  {...register('acheteur')}
                  className={fieldClass(errors.acheteur)}
                />
                {errors.acheteur ? (
                  <p className="mt-1 text-xs text-red-600">{errors.acheteur.message}</p>
                ) : null}
              </div>
            </>
          ) : null}

          {typeSortie === 'DECES' ? (
            <div>
              <label htmlFor="sortie-cause" className="mb-1 block text-sm font-medium text-slate-700">
                Cause (optionnel)
              </label>
              <input id="sortie-cause" type="text" {...register('cause')} className={fieldClass(errors.cause)} />
              {errors.cause ? <p className="mt-1 text-xs text-red-600">{errors.cause.message}</p> : null}
            </div>
          ) : null}

          {typeSortie === 'PERTE' ? (
            <div>
              <label htmlFor="sortie-circ" className="mb-1 block text-sm font-medium text-slate-700">
                Circonstances (optionnel)
              </label>
              <input
                id="sortie-circ"
                type="text"
                {...register('circonstance')}
                className={fieldClass(errors.circonstance)}
              />
              {errors.circonstance ? (
                <p className="mt-1 text-xs text-red-600">{errors.circonstance.message}</p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label htmlFor="sortie-notes" className="mb-1 block text-sm font-medium text-slate-700">
              Notes complémentaires
            </label>
            <textarea
              id="sortie-notes"
              rows={3}
              {...register('notes')}
              className={fieldClass(errors.notes)}
              placeholder="Détails libres…"
            />
            {errors.notes ? <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p> : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || pigeonsActifsSorted.length === 0}
            className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Enregistrement…' : 'Valider la sortie'}
          </button>
        </form>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTypeFilterFromChip('VENTE')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filterType === 'VENTE'
                  ? 'border-emerald-400 bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300/60'
                  : 'border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100'
              }`}
              aria-pressed={filterType === 'VENTE'}
            >
              Ventes ({stats.ventes})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilterFromChip('DECES')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filterType === 'DECES'
                  ? 'border-slate-400 bg-slate-200 text-slate-900 ring-1 ring-slate-400/50'
                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
              }`}
              aria-pressed={filterType === 'DECES'}
            >
              Décès ({stats.deces})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilterFromChip('PERTE')}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filterType === 'PERTE'
                  ? 'border-amber-400 bg-amber-100 text-amber-950 ring-1 ring-amber-300/60'
                  : 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100'
              }`}
              aria-pressed={filterType === 'PERTE'}
            >
              Pertes ({stats.pertes})
            </button>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
              Total {stats.total}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Clique sur une pastille pour filtrer par type ; reclique pour tout afficher.
          </p>

          {!loadSorties && !sortiesError && sorties.length > 0 ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="relative min-w-0 flex-1 lg:max-w-md">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher matricule, nom, acheteur, notes, cage, conjoint…"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    aria-label="Recherche sur l’historique des sorties"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="sortie-filter-impact" className="mb-1 block text-xs font-medium text-slate-600">
                    Impact (cascade)
                  </label>
                  <select
                    id="sortie-filter-impact"
                    value={filterImpact}
                    onChange={(e) => setFilterImpact(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="ALL">Toutes les sorties</option>
                    <option value="CAGE">Cage libérée (solo ou couple)</option>
                    <option value="COUPLE">Couple rompu</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sortie-filter-period" className="mb-1 block text-xs font-medium text-slate-600">
                    Période
                  </label>
                  <select
                    id="sortie-filter-period"
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="">Toutes les dates</option>
                    <option value="30d">30 derniers jours</option>
                    <option value="90d">90 derniers jours</option>
                    <option value="ytd">Depuis le 1er janvier</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label htmlFor="sorties-sort-by" className="mb-1 block text-xs font-medium text-slate-600">
                    Tri
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="sorties-sort-by"
                      value={sortBy}
                      onChange={(e) => setSortByAndSave(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    >
                      <option value="date">Date de sortie</option>
                      <option value="matricule">Matricule pigeon</option>
                      <option value="type">Type</option>
                    </select>
                    <button
                      type="button"
                      title={
                        sortDir === 'asc'
                          ? 'Ordre croissant — cliquer pour décroissant'
                          : 'Ordre décroissant — cliquer pour croissant'
                      }
                      onClick={toggleSortDirAndSave}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                      aria-label={sortDir === 'asc' ? 'Trier en ordre décroissant' : 'Trier en ordre croissant'}
                    >
                      {sortDir === 'asc' ? (
                        <ArrowDownNarrowWide className="size-4" aria-hidden />
                      ) : (
                        <ArrowUpNarrowWide className="size-4" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {hasActiveFilters ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500">
                    Filtres ou tri actifs : l’historique ci-dessous est restreint ou réordonné.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FilterX className="size-4" aria-hidden />
                    Réinitialiser filtres & tri
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/5 ring-1 ring-slate-900/[0.04]">
            <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50/90 via-white to-slate-50/80 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Historique des sorties</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Cliquez sur « Fiche » pour ouvrir le pigeon concerné. Chaque ligne est un document Sortie (cages /
                couple enregistrés sur le même document).
              </p>
            </div>

            {sortiesError ? (
              <div className="px-4 py-4 text-sm text-red-700">{sortiesError}</div>
            ) : loadSorties ? (
              <AppLoadingScreen variant="compact" loadingContext="sorties" message="Chargement des sorties…" />
            ) : sorties.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-600">
                <p className="font-medium text-slate-800">Aucune sortie enregistrée</p>
                <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
                  Utilise le formulaire à gauche dès qu’un pigeon doit quitter l’élevage (vente, décès ou perte).
                </p>
              </div>
            ) : filteredSorties.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-600">
                <p className="font-medium text-slate-800">Aucun résultat pour ta sélection</p>
                <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
                  Essaie d’autres mots-clés ou réinitialise les filtres.
                </p>
                <button
                  type="button"
                  className="mt-4 text-teal-700 underline hover:text-teal-800"
                  onClick={resetFilters}
                >
                  Réinitialiser filtres & tri
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-100/90 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Date</th>
                      <th className="whitespace-nowrap px-4 py-3">Type</th>
                      <th className="whitespace-nowrap px-4 py-3">Pigeon</th>
                      <th className="hidden px-4 py-3 md:table-cell">Détail</th>
                      <th className="hidden px-4 py-3 lg:table-cell">Cages / couple</th>
                      <th className="px-4 py-3 text-right">Fiche</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSorties.map((s) => {
                      const mat =
                        s.pigeonMatricule ?? pigeonById.get(s.pigeonId)?.matricule ?? s.pigeonId.slice(0, 8)
                      const nomP = pigeonById.get(s.pigeonId)?.nom
                      const detail =
                        s.type === 'VENTE'
                          ? s.prix != null
                            ? `${Number(s.prix).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} — ${s.acheteur ?? ''}`
                            : (s.acheteur ?? '—')
                          : s.type === 'DECES'
                            ? s.cause || '—'
                            : s.circonstance || '—'
                      const cageBits = []
                      if (s.cageSoloIdLiberee) {
                        const c = cageById.get(s.cageSoloIdLiberee)
                        cageBits.push(`Solo : ${c?.numero ?? s.cageSoloIdLiberee}`)
                      }
                      if (s.cageCoupleIdLiberee) {
                        const c = cageById.get(s.cageCoupleIdLiberee)
                        cageBits.push(`Couple : ${c?.numero ?? s.cageCoupleIdLiberee}`)
                      }
                      const coupleBit =
                        s.coupleRompuId && s.conjointPigeonId
                          ? `Couple rompu · conjoint ${pigeonById.get(s.conjointPigeonId)?.matricule ?? s.conjointPigeonId.slice(0, 6)}`
                          : s.coupleRompuId
                            ? 'Couple rompu'
                            : '—'

                      return (
                        <tr
                          key={s.id}
                          className="transition-colors odd:bg-white even:bg-slate-50/50 hover:bg-teal-50/40"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatTs(s.date)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[s.type] ?? 'border-slate-200 bg-slate-100'}`}
                            >
                              {s.type === 'VENTE' ? 'Vente' : s.type === 'DECES' ? 'Décès' : 'Perte'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-slate-900">{mat}</span>
                            {nomP ? (
                              <span className="mt-0.5 block text-xs font-normal text-slate-500">{nomP}</span>
                            ) : null}
                          </td>
                          <td className="hidden max-w-[16rem] px-4 py-3 text-slate-600 md:table-cell">
                            <span className="line-clamp-2" title={detail}>
                              {detail}
                            </span>
                            {(s.notes ?? '').trim() ? (
                              <span className="mt-1 block truncate text-xs text-slate-400" title={s.notes}>
                                {s.notes}
                              </span>
                            ) : null}
                          </td>
                          <td className="hidden max-w-xs px-4 py-3 text-xs text-slate-600 lg:table-cell">
                            <div>{cageBits.length ? cageBits.join(' · ') : '—'}</div>
                            <div className="mt-0.5 text-slate-500">{coupleBit}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              to={`/pigeons/${s.pigeonId}`}
                              state={{ back: SORTIES_BACK }}
                              className="font-medium text-teal-700 hover:underline"
                            >
                              Fiche
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
