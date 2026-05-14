import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  ExternalLink,
  FilterX,
  Heart,
  HeartCrack,
  Plus,
  Search,
  Egg,
} from 'lucide-react'
import { useCouples } from '@shared/hooks/useCouples'
import { usePigeons } from '@shared/hooks/usePigeons'
import { useCages } from '@shared/hooks/useCages'
import { rompreCouple } from '@shared/services/couplesService'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'

const statutCoupleClass = {
  ACTIF: 'border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-500/15',
  ROMPU: 'border-slate-200 bg-slate-100 text-slate-700 ring-slate-400/10',
}

const statutCoupleLabel = {
  ACTIF: 'Actif',
  ROMPU: 'Rompu',
}

const LS_COUPLES_PREFS = 'voliere-manager:couples-list-prefs'

function readCouplesPrefs() {
  try {
    const raw = localStorage.getItem(LS_COUPLES_PREFS)
    if (!raw) return { sortBy: 'dateDebut', sortDir: 'desc' }
    const o = JSON.parse(raw)
    return {
      sortBy: ['dateDebut', 'maleMatricule', 'femaleMatricule', 'statut'].includes(o.sortBy)
        ? o.sortBy
        : 'dateDebut',
      sortDir: o.sortDir === 'asc' ? 'asc' : 'desc',
    }
  } catch {
    return { sortBy: 'dateDebut', sortDir: 'desc' }
  }
}

function writeCouplesPrefs(prefs) {
  try {
    localStorage.setItem(LS_COUPLES_PREFS, JSON.stringify(prefs))
  } catch {
    /* quota */
  }
}

function formatDate(ts) {
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

function compareCouplesRow(a, b, sortBy, sortDir, pigeonById) {
  const dir = sortDir === 'desc' ? -1 : 1
  const mA = pigeonById.get(a.maleId)
  const mB = pigeonById.get(b.maleId)
  const fA = pigeonById.get(a.femelleId)
  const fB = pigeonById.get(b.femelleId)
  let cmp
  switch (sortBy) {
    case 'maleMatricule':
      cmp = (mA?.matricule ?? '').localeCompare(mB?.matricule ?? '', undefined, { numeric: true })
      break
    case 'femaleMatricule':
      cmp = (fA?.matricule ?? '').localeCompare(fB?.matricule ?? '', undefined, { numeric: true })
      break
    case 'statut':
      cmp = a.statut.localeCompare(b.statut)
      break
    default: {
      const ta = a.dateDebut?.toDate?.()?.getTime?.() ?? 0
      const tb = b.dateDebut?.toDate?.()?.getTime?.() ?? 0
      cmp = ta - tb
    }
  }
  if (cmp !== 0) return cmp * dir
  const ta = a.dateDebut?.toDate?.()?.getTime?.() ?? 0
  const tb = b.dateDebut?.toDate?.()?.getTime?.() ?? 0
  return tb - ta
}

function coupleMatchesSearch(c, qNorm, pigeonById) {
  if (!qNorm) return true
  const male = pigeonById.get(c.maleId)
  const fem = pigeonById.get(c.femelleId)
  const hay = [
    c.notes ?? '',
    male?.matricule ?? '',
    male?.nom ?? '',
    male?.race ?? '',
    male?.notes ?? '',
    fem?.matricule ?? '',
    fem?.nom ?? '',
    fem?.race ?? '',
    fem?.notes ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(qNorm)
}

/**
 * Liste des couples — recherche, filtres (statut, cage, race, volière), tri, rupture (dialog).
 */
export function CouplesListPage() {
  const { couples, loading, error, stats } = useCouples(false)
  const { pigeons, loading: loadPigeons } = usePigeons(false)
  const { cages, loading: loadCages } = useCages()

  const [filtreStatut, setFiltreStatut] = useState('ALL')
  const [query, setQuery] = useState('')
  const [filterCage, setFilterCage] = useState('')
  const [filterRace, setFilterRace] = useState('')
  const [filterVoliere, setFilterVoliere] = useState('')
  const [sortBy, setSortBy] = useState(() => readCouplesPrefs().sortBy)
  const [sortDir, setSortDir] = useState(() => readCouplesPrefs().sortDir)

  const rompreDialogRef = useRef(null)
  const [pendingRompre, setPendingRompre] = useState(null)

  const pigeonById = useMemo(() => {
    const m = new Map()
    for (const p of pigeons) m.set(p.id, p)
    return m
  }, [pigeons])

  const cageById = useMemo(() => {
    const m = new Map()
    for (const c of cages) m.set(c.id, c)
    return m
  }, [cages])

  const persistSort = useCallback((next) => {
    writeCouplesPrefs(next)
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

  const raceOptions = useMemo(() => {
    const set = new Set()
    for (const cp of couples) {
      const m = pigeonById.get(cp.maleId)
      const f = pigeonById.get(cp.femelleId)
      if (m?.race?.trim()) set.add(m.race.trim())
      if (f?.race?.trim()) set.add(f.race.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  }, [couples, pigeonById])

  const voliereOptions = useMemo(() => {
    const set = new Set()
    for (const cp of couples) {
      if (!cp.cageId) continue
      const cage = cageById.get(cp.cageId)
      if (cage) set.add(cage.voliereCode ?? 'A')
    }
    return Array.from(set).sort()
  }, [couples, cageById])

  const filtered = useMemo(() => {
    const qNorm = query.trim().toLowerCase()
    let rows = couples.filter((c) => filtreStatut === 'ALL' || c.statut === filtreStatut)

    rows = rows.filter((c) => coupleMatchesSearch(c, qNorm, pigeonById))

    if (filterCage === 'WITH') {
      rows = rows.filter((c) => Boolean(c.cageId && cageById.has(c.cageId)))
    } else if (filterCage === 'WITHOUT') {
      rows = rows.filter((c) => !c.cageId)
    }

    if (filterRace) {
      rows = rows.filter((c) => {
        const m = pigeonById.get(c.maleId)
        const f = pigeonById.get(c.femelleId)
        return m?.race === filterRace || f?.race === filterRace
      })
    }

    if (filterVoliere) {
      rows = rows.filter((c) => {
        if (!c.cageId) return false
        const cage = cageById.get(c.cageId)
        return cage && (cage.voliereCode ?? 'A') === filterVoliere
      })
    }

    rows = [...rows].sort((a, b) => compareCouplesRow(a, b, sortBy, sortDir, pigeonById))
    return rows
  }, [
    couples,
    filtreStatut,
    query,
    filterCage,
    filterRace,
    filterVoliere,
    sortBy,
    sortDir,
    pigeonById,
    cageById,
  ])

  const hasActiveFilters = Boolean(
    query.trim() ||
      filtreStatut !== 'ALL' ||
      filterCage ||
      filterRace ||
      filterVoliere ||
      sortBy !== 'dateDebut' ||
      sortDir !== 'desc',
  )

  const resetFilters = useCallback(() => {
    setQuery('')
    setFiltreStatut('ALL')
    setFilterCage('')
    setFilterRace('')
    setFilterVoliere('')
    setSortBy('dateDebut')
    setSortDir('desc')
    writeCouplesPrefs({ sortBy: 'dateDebut', sortDir: 'desc' })
  }, [])

  const openRompreDialog = (c) => {
    setPendingRompre(c)
    rompreDialogRef.current?.showModal()
  }

  const closeRompreDialog = () => {
    rompreDialogRef.current?.close()
    setPendingRompre(null)
  }

  const confirmRompre = async () => {
    if (!pendingRompre) return
    try {
      const r = await rompreCouple(pendingRompre.id)
      const parts = []
      if (r.restoredMale) parts.push('Mâle replacé dans sa cage d’origine.')
      if (r.restoredFemelle) parts.push('Femelle replacée dans sa cage d’origine.')
      for (const s of r.skipped) parts.push(s)
      toast.success(parts.length ? `Couple rompu. ${parts.join(' ')}` : 'Couple rompu.')
    } catch (e) {
      toast.error(e?.message || 'Action impossible')
    } finally {
      closeRompreDialog()
    }
  }

  const loadingAll = loading || loadPigeons || loadCages

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Couples</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
            Association <strong>mâle + femelle</strong> pour la reproduction. Un pigeon ne peut figurer que dans{' '}
            <strong>un seul couple actif</strong> à la fois. Rompre un couple libère la cage qui lui était dédiée.
          </p>
          {!loadingAll && couples.length > 0 ? (
            <p className="mt-2 text-xs text-slate-500" aria-live="polite">
              <span className="font-medium text-slate-700">{stats.total}</span> enregistrement(s) ·{' '}
              <span className="text-emerald-700">{stats.actifs} actif(s)</span>
              {stats.rompus ? (
                <>
                  {' '}
                  · <span>{stats.rompus} rompu(s)</span>
                </>
              ) : null}
              {filtered.length !== couples.length ||
              query.trim() ||
              filtreStatut !== 'ALL' ||
              filterCage ||
              filterRace ||
              filterVoliere ? (
                <>
                  {' '}
                  · <span className="text-slate-700">{filtered.length} affiché(s)</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <Link
          to="/couples/nouveau"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <Plus className="size-4" aria-hidden />
          Nouveau couple
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {!loadingAll && couples.length > 0 ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par matricule, nom, race, notes (couple ou pigeons)…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              aria-label="Recherche sur les couples et les pigeons associés"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="couples-filter-statut" className="mb-1 block text-xs font-medium text-slate-600">
                Statut couple
              </label>
              <select
                id="couples-filter-statut"
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="ALL">Tous</option>
                <option value="ACTIF">Actifs</option>
                <option value="ROMPU">Rompus</option>
              </select>
            </div>
            <div>
              <label htmlFor="couples-filter-cage" className="mb-1 block text-xs font-medium text-slate-600">
                Cage attribuée
              </label>
              <select
                id="couples-filter-cage"
                value={filterCage}
                onChange={(e) => setFilterCage(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="">Indifférent</option>
                <option value="WITH">Avec cage en volière</option>
                <option value="WITHOUT">Sans cage</option>
              </select>
            </div>
            <div>
              <label htmlFor="couples-filter-race" className="mb-1 block text-xs font-medium text-slate-600">
                Race (mâle ou femelle)
              </label>
              <select
                id="couples-filter-race"
                value={filterRace}
                onChange={(e) => setFilterRace(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="">Toutes les races</option>
                {raceOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="couples-filter-voliere" className="mb-1 block text-xs font-medium text-slate-600">
                Volière (si cage)
              </label>
              <select
                id="couples-filter-voliere"
                value={filterVoliere}
                onChange={(e) => setFilterVoliere(e.target.value)}
                disabled={voliereOptions.length === 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Toutes</option>
                {voliereOptions.map((code) => (
                  <option key={code} value={code}>
                    Volière {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1 sm:max-w-md">
              <label htmlFor="couples-sort-by" className="mb-1 block text-xs font-medium text-slate-600">
                Tri
              </label>
              <div className="flex gap-2">
                <select
                  id="couples-sort-by"
                  value={sortBy}
                  onChange={(e) => setSortByAndSave(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value="dateDebut">Date de début</option>
                  <option value="maleMatricule">Matricule mâle</option>
                  <option value="femaleMatricule">Matricule femelle</option>
                  <option value="statut">Statut</option>
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
                Filtres ou tri actifs : la liste est restreinte ou réordonnée.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FilterX className="size-4" aria-hidden />
                Réinitialiser filtres & recherche
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {loadingAll ? (
        <AppLoadingScreen variant="embedded" loadingContext="couples" message="Chargement des couples…" subtitle="Pigeons et cages associés." />
      ) : couples.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Heart className="size-9" strokeWidth={1.5} aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Aucun couple enregistré</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Crée un couple à partir de deux pigeons actifs. Tu pourras ensuite enregistrer des reproductions.
          </p>
          <Link
            to="/couples/nouveau"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="size-4" aria-hidden />
            Créer un couple
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-600 sm:py-6">
          <p className="font-medium text-slate-800">Aucun couple ne correspond à ta sélection.</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
            Essaie d’autres filtres ou vide la recherche.
          </p>
          <button type="button" className="mt-4 text-teal-700 underline hover:text-teal-800" onClick={resetFilters}>
            Réinitialiser filtres & recherche
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-900/5 ring-1 ring-slate-900/[0.04]">
          <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50/90 via-white to-slate-50/80 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">Liste des couples</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Cliquez sur un matricule pour ouvrir la fiche pigeon.
            </p>
          </div>
          <div className="overflow-x-auto md:overflow-x-visible">
            <table className="w-full min-w-[640px] divide-y divide-slate-200 text-left text-sm md:min-w-0">
              <thead className="border-b border-slate-200 bg-slate-100/90 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-3.5">
                    Début
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3.5">
                    Mâle
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3.5">
                    Femelle
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3.5">
                    Statut
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-3.5">
                    Cage
                  </th>
                  <th scope="col" className="hidden min-w-[8rem] max-w-[14rem] px-4 py-3.5 lg:table-cell">
                    Notes
                  </th>
                  <th scope="col" className="hidden whitespace-nowrap px-4 py-3.5 md:table-cell">
                    Fin
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const male = pigeonById.get(c.maleId)
                  const fem = pigeonById.get(c.femelleId)
                  const cage = c.cageId ? cageById.get(c.cageId) : null
                  return (
                    <tr key={c.id} className="transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-teal-50/50">
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">{formatDate(c.dateDebut)}</td>
                      <td className="px-4 py-3.5 text-slate-900">
                        {male ? (
                          <Link
                            to={`/pigeons/${male.id}`}
                            state={{
                              back: { path: '/couples', label: 'Retour aux couples' },
                            }}
                            className="group inline-flex items-center gap-1 font-mono font-medium text-teal-800 underline-offset-2 hover:text-teal-950 hover:underline"
                          >
                            {male.matricule}
                            <ExternalLink className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" aria-hidden />
                          </Link>
                        ) : null}
                        {male ? <span className="text-slate-600"> — {male.nom}</span> : null}
                        {!male ? <span className="text-slate-400">—</span> : null}
                      </td>
                      <td className="px-4 py-3.5 text-slate-900">
                        {fem ? (
                          <Link
                            to={`/pigeons/${fem.id}`}
                            state={{
                              back: { path: '/couples', label: 'Retour aux couples' },
                            }}
                            className="group inline-flex items-center gap-1 font-mono font-medium text-teal-800 underline-offset-2 hover:text-teal-950 hover:underline"
                          >
                            {fem.matricule}
                            <ExternalLink className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" aria-hidden />
                          </Link>
                        ) : null}
                        {fem ? <span className="text-slate-600"> — {fem.nom}</span> : null}
                        {!fem ? <span className="text-slate-400">—</span> : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm ring-1 ${statutCoupleClass[c.statut] || 'border-slate-200 bg-slate-100'}`}
                        >
                          {statutCoupleLabel[c.statut] ?? c.statut}
                        </span>
                      </td>
                      <td
                        className="max-w-[10rem] truncate px-4 py-3.5 text-slate-600"
                        title={cage ? `${cage.voliereCode ?? 'A'} · ${cage.numero}` : ''}
                      >
                        {cage ? (
                          <>
                            {cage.voliereCode ?? 'A'} · {cage.numero}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden max-w-[14rem] px-4 py-3.5 text-slate-600 lg:table-cell">
                        {c.notes?.trim() ? (
                          <span className="line-clamp-2 text-xs" title={c.notes}>
                            {c.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3.5 text-slate-500 md:table-cell">
                        {c.statut === 'ROMPU' ? formatDate(c.dateFin) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {c.statut === 'ACTIF' ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Link
                              to={`/reproductions/nouveau?coupleId=${encodeURIComponent(c.id)}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-900 hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
                            >
                              <Egg className="size-3.5 shrink-0" aria-hidden />
                              Reproduction
                            </Link>
                            <button
                              type="button"
                              onClick={() => openRompreDialog(c)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
                            >
                              <HeartCrack className="size-3.5 shrink-0" aria-hidden />
                              Rompre
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <dialog
        ref={rompreDialogRef}
        className="w-[min(28rem,calc(100vw-2rem))] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40"
        aria-labelledby="rompre-couple-title"
        onCancel={closeRompreDialog}
      >
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 id="rompre-couple-title" className="text-lg font-semibold">
            Rompre ce couple ?
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Le statut passera à <strong>ROMPU</strong>. Si une cage était réservée à ce couple, elle redeviendra{' '}
            <strong>libre</strong>.
          </p>
        </div>
        {pendingRompre ? (
          <p className="px-5 py-3 text-sm text-slate-800">
            {pigeonById.get(pendingRompre.maleId)?.matricule ?? '?'} +{' '}
            {pigeonById.get(pendingRompre.femelleId)?.matricule ?? '?'}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={closeRompreDialog}
          >
            Annuler
          </button>
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            onClick={confirmRompre}
          >
            Rompre le couple
          </button>
        </div>
      </dialog>
    </div>
  )
}
