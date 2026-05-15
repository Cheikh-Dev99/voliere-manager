import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  ArrowLeft,
  CopyPlus,
  FilterX,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useCages } from '@shared/hooks/useCages'
import { useUserProfile } from '@shared/hooks/useUserProfile'
import { mergeProfileVoliereCodesWithCages } from '@shared/utils/voliereCodesMerge'
import { supprimerCage } from '@shared/services/cagesService'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'
import useAuthStore from '../stores/authStore'
import {
  dmDataTableCard,
  dmDataTableHeader,
  dmDataTableSub,
  dmDataTableTitle,
  dmFilterCard,
  dmFilterResetRow,
  dmGhostButton,
  dmInputSearch,
  dmLabelXs,
  dmSelect,
  dmSortDirButton,
  dmTableClass,
  dmTableWrap,
  dmThead,
  dmTbody,
} from '../theme/voliereDarkUi'

const statutLabel = {
  LIBRE: 'Libre',
  OCCUPE_PIGEON: '1 pigeon',
  OCCUPE_COUPLE: 'Couple',
}

const LS_CAGES_FILTERS = 'voliere-manager:cages-list-filters'

function readPrefs() {
  try {
    const raw = localStorage.getItem(LS_CAGES_FILTERS)
    if (!raw) return { sortBy: 'voliere', sortDir: 'asc', statut: 'ALL', voliere: 'ALL' }
    const o = JSON.parse(raw)
    return {
      sortBy: ['numero', 'voliere', 'statut', 'superficie', 'nom'].includes(o.sortBy) ? o.sortBy : 'voliere',
      sortDir: o.sortDir === 'desc' ? 'desc' : 'asc',
      statut: ['ALL', 'LIBRE', 'OCCUPE_PIGEON', 'OCCUPE_COUPLE'].includes(o.statut) ? o.statut : 'ALL',
      voliere: typeof o.voliere === 'string' ? o.voliere : 'ALL',
    }
  } catch {
    return { sortBy: 'voliere', sortDir: 'asc', statut: 'ALL', voliere: 'ALL' }
  }
}

function writePrefs(p) {
  try {
    localStorage.setItem(LS_CAGES_FILTERS, JSON.stringify(p))
  } catch {
    /* ignore */
  }
}

function compareRows(a, b, sortBy, sortDir) {
  const dir = sortDir === 'desc' ? -1 : 1
  let cmp = 0
  switch (sortBy) {
    case 'nom':
      cmp = (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' })
      break
    case 'numero':
      cmp = a.numero.localeCompare(b.numero, undefined, { numeric: true })
      break
    case 'statut':
      cmp = a.statut.localeCompare(b.statut)
      break
    case 'superficie':
      cmp = (Number(a.superficie) || 0) - (Number(b.superficie) || 0)
      break
    default:
      cmp = (a.voliereCode ?? 'A').localeCompare(b.voliereCode ?? 'A', 'fr', { sensitivity: 'base' })
      if (cmp === 0) cmp = a.numero.localeCompare(b.numero, undefined, { numeric: true })
  }
  if (cmp !== 0) return cmp * dir
  return a.numero.localeCompare(b.numero, undefined, { numeric: true })
}

export function CagesListPage() {
  const authEmail = useAuthStore((s) => s.user?.email ?? '')
  const { profile } = useUserProfile(authEmail)
  const { cages, loading, error } = useCages()
  const [deletingId, setDeletingId] = useState(null)
  const [deletingBulk, setDeletingBulk] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const selectAllRef = useRef(null)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState(() => readPrefs().sortBy)
  const [sortDir, setSortDir] = useState(() => readPrefs().sortDir)
  const [filterStatut, setFilterStatut] = useState(() => readPrefs().statut)
  const [filterVoliere, setFilterVoliere] = useState(() => readPrefs().voliere)

  const codesVoliere = useMemo(
    () => mergeProfileVoliereCodesWithCages(profile?.voliereCodes, cages),
    [profile?.voliereCodes, cages],
  )

  const qNorm = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    return cages.filter((c) => {
      if (filterStatut !== 'ALL' && c.statut !== filterStatut) return false
      if (filterVoliere !== 'ALL' && (c.voliereCode ?? 'A') !== filterVoliere) return false
      if (!qNorm) return true
      const hay = [
        c.numero,
        c.nom,
        c.description ?? '',
        c.voliereCode ?? 'A',
        statutLabel[c.statut] ?? c.statut,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(qNorm)
    })
  }, [cages, filterStatut, filterVoliere, qNorm])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compareRows(a, b, sortBy, sortDir)),
    [filtered, sortBy, sortDir],
  )

  const cageById = useMemo(() => {
    const m = new Map()
    for (const c of cages) m.set(c.id, c)
    return m
  }, [cages])

  const libreSortedIds = useMemo(
    () => sorted.filter((c) => c.statut === 'LIBRE').map((c) => c.id),
    [sorted],
  )

  const selectedLibreCages = useMemo(() => {
    return selectedIds
      .map((id) => cageById.get(id))
      .filter((c) => c && c.statut === 'LIBRE')
  }, [selectedIds, cageById])

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => cageById.has(id)))
  }, [cageById])

  useEffect(() => {
    const n = libreSortedIds.length
    const sel = libreSortedIds.filter((id) => selectedIds.includes(id)).length
    const el = selectAllRef.current
    if (el) el.indeterminate = n > 0 && sel > 0 && sel < n
  }, [libreSortedIds, selectedIds])

  const toggleSelectId = useCallback((id) => {
    const c = cageById.get(id)
    if (!c || c.statut !== 'LIBRE') return
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [cageById])

  const toggleSelectAllVisibleLibre = useCallback(() => {
    if (libreSortedIds.length === 0) return
    const allSelected = libreSortedIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !libreSortedIds.includes(id)))
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...libreSortedIds])])
    }
  }, [libreSortedIds, selectedIds])

  const clearSelection = useCallback(() => setSelectedIds([]), [])

  const hasActiveFilters =
    qNorm.length > 0 || filterStatut !== 'ALL' || filterVoliere !== 'ALL'

  function resetFilters() {
    setQuery('')
    setFilterStatut('ALL')
    setFilterVoliere('ALL')
    setSortBy('voliere')
    setSortDir('asc')
    writePrefs({ sortBy: 'voliere', sortDir: 'asc', statut: 'ALL', voliere: 'ALL' })
  }

  function persistSort(nextBy, nextDir) {
    setSortBy(nextBy)
    setSortDir(nextDir)
    writePrefs({
      sortBy: nextBy,
      sortDir: nextDir,
      statut: filterStatut,
      voliere: filterVoliere,
    })
  }

  function persistFilters(nextStatut, nextVoliere) {
    setFilterStatut(nextStatut)
    setFilterVoliere(nextVoliere)
    writePrefs({
      sortBy,
      sortDir,
      statut: nextStatut,
      voliere: nextVoliere,
    })
  }

  async function handleDelete(cage) {
    if (cage.statut !== 'LIBRE') {
      toast.error('Libère la cage avant de la supprimer.')
      return
    }
    if (!window.confirm(`Supprimer la cage ${cage.numero} (${cage.nom}) ?`)) return
    setDeletingId(cage.id)
    try {
      await supprimerCage(cage.id)
      toast.success('Cage supprimée')
      setSelectedIds((prev) => prev.filter((id) => id !== cage.id))
    } catch (e) {
      toast.error(e?.message || 'Suppression impossible')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteSelected() {
    if (selectedLibreCages.length === 0) {
      toast.error('Aucune cage libre dans la sélection.')
      return
    }
    const labels = selectedLibreCages.map((c) => `${c.voliereCode ?? 'A'} · ${c.numero}`).join(', ')
    const msg = `Supprimer ${selectedLibreCages.length} cage(s) libre(s) ?\n\n${labels}`
    if (!window.confirm(msg)) return
    setDeletingBulk(true)
    const failed = []
    for (const c of selectedLibreCages) {
      try {
        await supprimerCage(c.id)
      } catch (e) {
        failed.push({ id: c.id, err: e?.message || 'Erreur' })
      }
    }
    setDeletingBulk(false)
    if (failed.length === 0) {
      toast.success(`${selectedLibreCages.length} cage(s) supprimée(s).`)
      clearSelection()
    } else {
      toast.error(`${failed.length} suppression(s) en échec sur ${selectedLibreCages.length}.`)
      setSelectedIds(failed.map((f) => f.id))
    }
  }

  if (loading) {
    return <AppLoadingScreen variant="embedded" loadingContext="cages" message="Chargement des cages…" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:underline dark:text-teal-300"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Visualisation
          </Link>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50 sm:text-xl">Gestion des cages</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/cages/nouveau?mode=lot"
            className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-100"
          >
            <CopyPlus className="size-4" aria-hidden />
            Série de cages
          </Link>
          <Link
            to="/cages/nouveau"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
          >
            <Plus className="size-4" aria-hidden />
            Nouvelle cage
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      ) : null}

      <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
        Filtre par volière, statut ou recherche (numéro, nom, description). Trie la grille selon tes préférences — les
        réglages sont mémorisés sur cet appareil. Coche les cages <strong>libres</strong> pour en supprimer plusieurs à
        la fois.
      </p>

      {cages.length > 0 ? (
        <div className={dmFilterCard}>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="min-w-[min(100%,18rem)] flex-1">
              <label htmlFor="cages-search" className={dmLabelXs}>
                Recherche
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="cages-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Numéro, nom, description…"
                  className={dmInputSearch}
                />
              </div>
            </div>
            <div>
              <label htmlFor="cages-voliere" className={dmLabelXs}>
                Volière
              </label>
              <select
                id="cages-voliere"
                value={filterVoliere}
                onChange={(e) => persistFilters(filterStatut, e.target.value)}
                className={`${dmSelect} min-w-[8rem] md:w-auto`}
              >
                <option value="ALL">Toutes</option>
                {codesVoliere.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cages-statut" className={dmLabelXs}>
                Statut
              </label>
              <select
                id="cages-statut"
                value={filterStatut}
                onChange={(e) => persistFilters(e.target.value, filterVoliere)}
                className={`${dmSelect} min-w-[11rem] md:w-auto`}
              >
                <option value="ALL">Tous</option>
                <option value="LIBRE">Libre</option>
                <option value="OCCUPE_PIGEON">1 pigeon</option>
                <option value="OCCUPE_COUPLE">Couple</option>
              </select>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <span className={dmLabelXs}>Trier par</span>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => persistSort(e.target.value, sortDir)}
                    className={dmSelect}
                  >
                    <option value="voliere">Volière puis n°</option>
                    <option value="nom">Nom</option>
                    <option value="numero">Numéro</option>
                    <option value="statut">Statut</option>
                    <option value="superficie">Superficie</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => persistSort(sortBy, sortDir === 'asc' ? 'desc' : 'asc')}
                    className={dmSortDirButton}
                    aria-label={sortDir === 'asc' ? 'Ordre décroissant' : 'Ordre croissant'}
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
          </div>
          {hasActiveFilters ? (
            <div className={`mt-3 ${dmFilterResetRow}`}>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sorted.length} cage{sorted.length > 1 ? 's' : ''} affichée{sorted.length > 1 ? 's' : ''} sur{' '}
                {cages.length}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className={`${dmGhostButton} px-3 py-1.5 text-xs`}
              >
                <FilterX className="size-3.5" aria-hidden />
                Réinitialiser filtres
              </button>
            </div>
          ) : (
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {cages.length} cage{cages.length > 1 ? 's' : ''} au total
            </p>
          )}
        </div>
      ) : null}

      {cages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-900">
          <LayoutGrid className="mx-auto size-10 text-slate-300 dark:text-slate-500" aria-hidden />
          <p className="mt-3 text-slate-700 dark:text-slate-200">Aucune cage enregistrée pour ton compte.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/cages/nouveau?mode=lot"
              className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-900 hover:bg-teal-100"
            >
              <CopyPlus className="size-4" aria-hidden />
              Créer une série (ex. A01–A20)
            </Link>
            <Link
              to="/cages/nouveau"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Plus className="size-4" aria-hidden />
              Une première cage
            </Link>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">Aucune cage ne correspond aux filtres.</p>
          <button type="button" className="mt-3 text-teal-800 underline hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200" onClick={resetFilters}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/90 px-4 py-3 text-sm text-teal-950 shadow-sm dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-100">
              <p className="font-medium">
                {selectedIds.length} ligne{selectedIds.length > 1 ? 's' : ''} sélectionnée
                {selectedIds.length > 1 ? 's' : ''}
                {selectedLibreCages.length !== selectedIds.length ? (
                  <span className="ml-1 font-normal text-teal-800/90 dark:text-teal-300/90">
                    ({selectedLibreCages.length} libre{selectedLibreCages.length > 1 ? 's' : ''} supprimable
                    {selectedLibreCages.length > 1 ? 's' : ''})
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={deletingBulk}
                  className="rounded-lg border border-teal-300/80 bg-white px-3 py-1.5 text-xs font-medium text-teal-900 hover:bg-teal-50 disabled:opacity-50 dark:border-teal-700/50 dark:bg-slate-800 dark:text-teal-200 dark:hover:bg-slate-700"
                >
                  Tout désélectionner
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSelected()}
                  disabled={deletingBulk || selectedLibreCages.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-3.5 shrink-0" aria-hidden />
                  {deletingBulk ? 'Suppression…' : `Supprimer la sélection (${selectedLibreCages.length})`}
                </button>
              </div>
            </div>
          ) : null}
          <div className={dmDataTableCard}>
            <div className={dmDataTableHeader}>
              <p className={dmDataTableTitle}>Liste des cages</p>
              <p className={dmDataTableSub}>
                Coche les lignes libres pour une suppression groupée. Actions par cage en fin de ligne.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 md:hidden">
              {sorted.map((c) => (
                <article
                  key={c.id}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-600 dark:bg-slate-800/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelectId(c.id)}
                      disabled={deletingBulk || c.statut !== 'LIBRE'}
                      aria-label={
                        c.statut === 'LIBRE'
                          ? `Sélectionner la cage ${c.numero}`
                          : `Cage ${c.numero} occupée, non sélectionnable`
                      }
                      title={c.statut !== 'LIBRE' ? 'Libère la cage pour pouvoir la sélectionner' : undefined}
                    />
                    <span className="text-right font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                      {c.voliereCode ?? 'A'} · {c.numero}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-600 dark:text-slate-300">{c.nom || '—'}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{c.superficie} m²</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                    {statutLabel[c.statut] ?? c.statut}
                  </p>
                  <div className="mt-auto flex flex-col gap-1 border-t border-slate-100 pt-2 dark:border-slate-600">
                    <Link
                      to={`/cages/${c.id}/modifier`}
                      className="inline-flex items-center justify-center gap-1 rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
                    >
                      <Pencil className="size-3 shrink-0" aria-hidden />
                      Modifier
                    </Link>
                    <button
                      type="button"
                      disabled={c.statut !== 'LIBRE' || deletingId === c.id || deletingBulk}
                      onClick={() => void handleDelete(c)}
                      className="inline-flex items-center justify-center gap-1 rounded border border-rose-200 px-2 py-1 text-[10px] font-medium text-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
                      title={c.statut !== 'LIBRE' ? 'Libère la cage d’abord' : 'Supprimer'}
                    >
                      <Trash2 className="size-3 shrink-0" aria-hidden />
                      Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden md:block">
            <div className={dmTableWrap}>
          <table className={dmTableClass('min-w-[640px]')}>
            <thead className={dmThead}>
              <tr>
                <th className="w-10 px-2 py-3 text-center" scope="col">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    checked={libreSortedIds.length > 0 && libreSortedIds.every((id) => selectedIds.includes(id))}
                    onChange={toggleSelectAllVisibleLibre}
                    disabled={deletingBulk || libreSortedIds.length === 0}
                    aria-label="Sélectionner toutes les cages libres affichées"
                    title="Cages libres uniquement (lignes affichées)"
                  />
                </th>
                <th className="px-4 py-3">Volière</th>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">m²</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={dmTbody}>
              {sorted.map((c) => (
                <tr
                  key={c.id}
                  className={`text-slate-800 transition-colors hover:bg-teal-50/40 dark:text-slate-200 dark:hover:bg-teal-950/40 ${
                    selectedIds.includes(c.id)
                      ? 'bg-teal-50/50 dark:bg-teal-950/35'
                      : 'odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-800/50'
                  }`}
                >
                  <td className="px-2 py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelectId(c.id)}
                      disabled={deletingBulk || c.statut !== 'LIBRE'}
                      aria-label={
                        c.statut === 'LIBRE'
                          ? `Sélectionner la cage ${c.numero}`
                          : `Cage ${c.numero} occupée, non sélectionnable`
                      }
                      title={c.statut !== 'LIBRE' ? 'Libère la cage pour pouvoir la sélectionner' : undefined}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{c.voliereCode ?? 'A'}</td>
                  <td className="px-4 py-3">{c.numero}</td>
                  <td className="px-4 py-3">{c.nom}</td>
                  <td className="px-4 py-3">{c.superficie}</td>
                  <td className="px-4 py-3">{statutLabel[c.statut] ?? c.statut}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/cages/${c.id}/modifier`}
                        className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Modifier
                      </Link>
                      <button
                        type="button"
                        disabled={c.statut !== 'LIBRE' || deletingId === c.id || deletingBulk}
                        onClick={() => void handleDelete(c)}
                        className="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title={c.statut !== 'LIBRE' ? 'Libère la cage d’abord' : 'Supprimer'}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
