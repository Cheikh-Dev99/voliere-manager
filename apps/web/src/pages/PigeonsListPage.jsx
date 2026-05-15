import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Plus,
  Pencil,
  Trash2,
  Bird,
  Search,
  FileText,
  LayoutGrid,
  LayoutList,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  FilterX,
  Stethoscope,
  GitBranch,
  Download,
} from 'lucide-react'
import { useCouples } from '@shared/hooks/useCouples'
import { usePigeons } from '@shared/hooks/usePigeons'
import { buildPigeonIdsInActifsCouples, libelleColonneCouplePigeon } from '@shared/utils/pigeonCoupleDisplay'
import { buildPigeonCsvRows, PIGEON_CSV_HEADERS } from '@shared/utils/pigeonCsv'
import { modifierPigeon, supprimerPigeon } from '@shared/services/pigeonsService'
import { clearPigeonLocalPhoto, getPigeonDisplayPhotoSrc } from '../utils/localPigeonPhoto'
import { downloadCsv } from '../utils/csvDownload'
import {
  dmDataTableHeader,
  dmDataTableSub,
  dmDataTableTitle,
  dmInteractiveCard,
  dmTableClass,
  dmTableWrap,
  dmThead,
  dmTbody,
  dmTrStriped,
} from '../theme/voliereDarkUi'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'

/** État de navigation pour la fiche pigeon : lien « Retour » vers cette liste. */
const LISTE_PIGEONS_BACK = { path: '/pigeons', label: 'Liste des pigeons' }

const statutClass = {
  ACTIF: 'bg-emerald-100 text-emerald-800',
  VENDU: 'bg-slate-200 text-slate-800',
  MORT: 'bg-zinc-200 text-zinc-800',
  PERDU: 'bg-amber-100 text-amber-900',
}

/** Valeur filtre « pigeon actif dans un couple actif » (pas un champ Firestore). */
const FILTRE_STATUT_EN_COUPLE = 'EN_COUPLE'
/** Filtre : fiches soft-deleted (`deletedAt`). */
const FILTRE_STATUT_ARCHIVE = 'ARCHIVE'

const LS_LIST_PREFS = 'voliere-manager:pigeons-list-prefs'

function defaultViewModeForViewport() {
  if (typeof window === 'undefined') return 'list'
  try {
    return window.matchMedia('(max-width: 767px)').matches ? 'grid' : 'list'
  } catch {
    return 'list'
  }
}

function readListPrefs() {
  try {
    const raw = localStorage.getItem(LS_LIST_PREFS)
    if (!raw) return { viewMode: defaultViewModeForViewport(), sortBy: 'matricule', sortDir: 'asc' }
    const o = JSON.parse(raw)
    return {
      viewMode: o.viewMode === 'grid' ? 'grid' : 'list',
      sortBy: ['matricule', 'nom', 'race', 'statut'].includes(o.sortBy) ? o.sortBy : 'matricule',
      sortDir: o.sortDir === 'desc' ? 'desc' : 'asc',
    }
  } catch {
    return { viewMode: defaultViewModeForViewport(), sortBy: 'matricule', sortDir: 'asc' }
  }
}

function writeListPrefs(prefs) {
  try {
    localStorage.setItem(LS_LIST_PREFS, JSON.stringify(prefs))
  } catch {
    /* quota / navigation privée */
  }
}

function comparePigeons(a, b, sortBy, sortDir) {
  const dir = sortDir === 'desc' ? -1 : 1
  let cmp
  switch (sortBy) {
    case 'nom':
      cmp = a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })
      break
    case 'race':
      cmp = a.race.localeCompare(b.race, 'fr', { sensitivity: 'base' })
      break
    case 'statut':
      cmp = a.statut.localeCompare(b.statut)
      break
    default:
      cmp = a.matricule.localeCompare(b.matricule, 'fr', { numeric: true })
  }
  if (cmp !== 0) return cmp * dir
  return a.matricule.localeCompare(b.matricule, 'fr', { numeric: true })
}

/** Pastille statut cliquable : liste déroulante native (évite d’être coupée par overflow du tableau). */
function PigeonStatutSelect({ pigeon, saving, onStatutChange }) {
  if (pigeon.deletedAt) {
    return (
      <span
        className="inline-flex max-w-[9.5rem] cursor-not-allowed rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
        title="Archivé — plus de modification depuis la liste"
      >
        Archivé
      </span>
    )
  }
  const selectTone = statutClass[pigeon.statut] || 'bg-slate-100'
  return (
    <select
      value={pigeon.statut}
      disabled={saving}
      aria-label={`Changer le statut de ${pigeon.matricule} (actuellement ${pigeon.statut})`}
      title="Cliquer pour changer le statut"
      onChange={(e) => {
        const next = e.target.value
        if (next !== pigeon.statut) onStatutChange(pigeon, next)
      }}
      className={`inline-flex max-w-[9.5rem] cursor-pointer appearance-none rounded-full border border-black/5 py-0.5 pl-2.5 pr-7 text-xs font-medium shadow-sm outline-none ring-offset-1 transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-wait disabled:opacity-60 ${selectTone}`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.35rem center',
      }}
    >
      <option value="ACTIF">ACTIF</option>
      <option value="VENDU">VENDU</option>
      <option value="MORT">MORT</option>
      <option value="PERDU">PERDU</option>
    </select>
  )
}

/** Libellé dérivé : actif dans un couple Firestore ACTIF → « En couple », sinon « Libre ». */
function PigeonCoupleBadge({ pigeon, pigeonIdsEnCouplesActifs }) {
  const libelle = libelleColonneCouplePigeon(pigeon, pigeonIdsEnCouplesActifs)
  if (libelle == null) {
    return (
      <span className="text-sm text-slate-400 tabular-nums" aria-hidden>
        —
      </span>
    )
  }
  const isEnCouple = libelle === 'En couple'
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isEnCouple ? 'bg-rose-100 text-rose-900 ring-1 ring-rose-200/80' : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
      }`}
    >
      {libelle}
    </span>
  )
}

function PigeonActions({ p, onDetail, onDelete }) {
  const archived = Boolean(p.deletedAt)
  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        className="inline-flex rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        title="Voir la description"
        aria-label={`Description de ${p.matricule}`}
        onClick={() => onDetail(p)}
      >
        <FileText className="size-4" aria-hidden />
      </button>
      {!archived ? (
        <Link
          to={`/pigeons/${p.id}/modifier`}
          className="inline-flex rounded-lg p-2 text-teal-700 hover:bg-teal-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          title="Modifier"
          aria-label={`Modifier ${p.matricule}`}
        >
          <Pencil className="size-4" aria-hidden />
        </Link>
      ) : null}
      {!archived ? (
        <button
          type="button"
          className="inline-flex rounded-lg p-2 text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
          title="Archiver (retirer de l’effectif)"
          aria-label={`Archiver ${p.matricule}`}
          onClick={() => onDelete(p)}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Liste des pigeons — recherche, filtres (race, sexe, statut), tri, vues liste / grille.
 */
export function PigeonsListPage() {
  const { pigeons, archivedPigeons, loading, error, stats } = usePigeons(false)
  const { couples, loading: couplesLoading, error: couplesError } = useCouples(true)
  const listLoading = loading || couplesLoading
  const listError = error || couplesError

  const pigeonIdsEnCouplesActifs = useMemo(() => buildPigeonIdsInActifsCouples(couples), [couples])

  const [query, setQuery] = useState('')
  const [filterRace, setFilterRace] = useState('')
  const [filterSexe, setFilterSexe] = useState('')
  const [filterStatut, setFilterStatut] = useState('')
  const [viewMode, setViewMode] = useState(() => readListPrefs().viewMode)
  const [sortBy, setSortBy] = useState(() => readListPrefs().sortBy)
  const [sortDir, setSortDir] = useState(() => readListPrefs().sortDir)

  const hasAnyPigeon = pigeons.length + archivedPigeons.length > 0

  const listBase = useMemo(
    () => (filterStatut === FILTRE_STATUT_ARCHIVE ? archivedPigeons : pigeons),
    [filterStatut, archivedPigeons, pigeons],
  )

  const deleteDialogRef = useRef(null)
  const detailDialogRef = useRef(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [detailPigeon, setDetailPigeon] = useState(null)
  const [savingStatutId, setSavingStatutId] = useState(null)

  const persistViewSort = useCallback((next) => {
    writeListPrefs(next)
  }, [])

  const setViewModeAndSave = useCallback(
    (mode) => {
      setViewMode(mode)
      persistViewSort({ viewMode: mode, sortBy, sortDir })
    },
    [persistViewSort, sortBy, sortDir],
  )

  const setSortByAndSave = useCallback(
    (field) => {
      setSortBy(field)
      persistViewSort({ viewMode, sortBy: field, sortDir })
    },
    [persistViewSort, sortDir, viewMode],
  )

  const toggleSortDirAndSave = useCallback(() => {
    setSortDir((d) => {
      const next = d === 'asc' ? 'desc' : 'asc'
      persistViewSort({ viewMode, sortBy, sortDir: next })
      return next
    })
  }, [persistViewSort, sortBy, viewMode])

  const raceOptions = useMemo(() => {
    const set = new Set()
    for (const p of [...pigeons, ...archivedPigeons]) {
      if (p.race?.trim()) set.add(p.race.trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
  }, [pigeons, archivedPigeons])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = listBase.filter((p) => {
      if (filterRace && p.race !== filterRace) return false
      if (filterSexe && p.sexe !== filterSexe) return false
      if (filterStatut === FILTRE_STATUT_ARCHIVE) {
        /* listBase est déjà limité aux archivés */
      } else if (filterStatut === FILTRE_STATUT_EN_COUPLE) {
        if (!(p.statut === 'ACTIF' && pigeonIdsEnCouplesActifs.has(p.id))) return false
      } else if (filterStatut && p.statut !== filterStatut) return false
      if (!q) return true
      return (
        p.matricule.toLowerCase().includes(q) ||
        p.nom.toLowerCase().includes(q) ||
        p.race.toLowerCase().includes(q) ||
        (p.notes ?? '').toLowerCase().includes(q)
      )
    })
    rows = [...rows].sort((a, b) => comparePigeons(a, b, sortBy, sortDir))
    return rows
  }, [
    listBase,
    query,
    filterRace,
    filterSexe,
    filterStatut,
    sortBy,
    sortDir,
    pigeonIdsEnCouplesActifs,
  ])

  const hasActiveFilters = Boolean(
    query.trim() || filterRace || filterSexe || filterStatut,
  )

  const resetFilters = useCallback(() => {
    setQuery('')
    setFilterRace('')
    setFilterSexe('')
    setFilterStatut('')
  }, [])

  const handleExportCsv = useCallback(() => {
    if (filtered.length === 0) {
      toast.error('Aucune ligne à exporter.')
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(
      `pigeons-export-${stamp}.csv`,
      [...PIGEON_CSV_HEADERS],
      buildPigeonCsvRows(filtered, pigeonIdsEnCouplesActifs),
    )
    toast.success(`Export CSV : ${filtered.length} ligne(s).`)
  }, [filtered, pigeonIdsEnCouplesActifs])

  const openDeleteDialog = useCallback((p) => {
    setPendingDelete(p)
    deleteDialogRef.current?.showModal()
  }, [])

  const closeDeleteDialog = () => {
    deleteDialogRef.current?.close()
    setPendingDelete(null)
  }

  const openDetailDialog = useCallback((p) => {
    setDetailPigeon(p)
    detailDialogRef.current?.showModal()
  }, [])

  const closeDetailDialog = () => {
    detailDialogRef.current?.close()
    setDetailPigeon(null)
  }

  const handleStatutChange = useCallback(async (pigeon, nextStatut) => {
    if (pigeon.deletedAt) {
      toast.error('Impossible de modifier le statut d’un pigeon archivé.')
      return
    }
    if (nextStatut === pigeon.statut) return
    setSavingStatutId(pigeon.id)
    try {
      await modifierPigeon(pigeon.id, { statut: nextStatut })
      toast.success('Statut mis à jour')
    } catch (e) {
      toast.error(e?.message || 'Impossible de modifier le statut')
    } finally {
      setSavingStatutId(null)
    }
  }, [])

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await supprimerPigeon(pendingDelete.id)
      clearPigeonLocalPhoto(pendingDelete.id)
      toast.success('Pigeon archivé : il disparaît de l’effectif mais reste consultable via le filtre « Archivés ».')
    } catch (e) {
      toast.error(e?.message || 'Suppression impossible')
    } finally {
      closeDeleteDialog()
    }
  }

  const pigeonCards = useMemo(
    () =>
      filtered.map((p) => {
        const photoSrc = getPigeonDisplayPhotoSrc(p)
        return (
          <article
            key={p.id}
            className={dmInteractiveCard}
          >
            <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
              {photoSrc ? (
                <img src={photoSrc} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-slate-400">
                  <Bird className="size-12 opacity-40" aria-hidden />
                </div>
              )}
              <div className="absolute right-2 top-2 z-10">
                <PigeonStatutSelect
                  pigeon={p}
                  saving={savingStatutId === p.id}
                  onStatutChange={handleStatutChange}
                />
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div>
                <Link
                  to={`/pigeons/${p.id}`}
                  state={{ back: LISTE_PIGEONS_BACK }}
                  className="font-mono text-sm font-semibold text-teal-800 hover:underline dark:text-teal-300"
                >
                  {p.matricule}
                </Link>
                <p className="truncate text-base font-medium text-slate-800 dark:text-slate-100">{p.nom}</p>
                <p className="truncate text-sm text-slate-600 dark:text-slate-300">{p.race}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{p.sexe === 'MALE' ? 'Mâle' : 'Femelle'}</p>
                <div className="mt-1.5">
                  <PigeonCoupleBadge pigeon={p} pigeonIdsEnCouplesActifs={pigeonIdsEnCouplesActifs} />
                </div>
              </div>
              <div className="mt-auto space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <Link
                  to={`/pigeons/${p.id}/sante`}
                  state={{ back: LISTE_PIGEONS_BACK }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 hover:underline dark:text-teal-300"
                >
                  <Stethoscope className="size-3.5 shrink-0" aria-hidden />
                  Carnet de santé
                </Link>
                <Link
                  to={`/pigeons/${p.id}/genealogie`}
                  state={{ back: LISTE_PIGEONS_BACK }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 hover:underline dark:text-teal-300"
                >
                  <GitBranch className="size-3.5 shrink-0" aria-hidden />
                  Généalogie
                </Link>
                <PigeonActions p={p} onDetail={openDetailDialog} onDelete={openDeleteDialog} />
              </div>
            </div>
          </article>
        )
      }),
    [filtered, pigeonIdsEnCouplesActifs, savingStatutId, handleStatutChange, openDetailDialog, openDeleteDialog],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Pigeons</h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Chaque pigeon a un <strong>matricule unique</strong> (bague). Les animaux retirés de
            l’effectif restent visibles pour la traçabilité, sans être effacés définitivement. La{' '}
            <strong>description</strong> (champ du formulaire) s’affiche via l’icône feuille{' '}
            <span className="whitespace-nowrap">« Détails »</span> ou en cliquant sur{' '}
            <span className="whitespace-nowrap">« Modifier »</span>.
          </p>
          {!listLoading && hasAnyPigeon ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
              <span className="font-medium text-slate-700 dark:text-slate-300">{stats.total}</span> fiche(s) ·{' '}
              <span className="text-emerald-700 dark:text-emerald-400">{stats.actifs} actif(s)</span>
              {stats.vendus ? (
                <>
                  {' '}
                  · <span>{stats.vendus} vendu(s)</span>
                </>
              ) : null}
              {stats.morts ? (
                <>
                  {' '}
                  · <span>{stats.morts} décès</span>
                </>
              ) : null}
              {stats.perdus ? (
                <>
                  {' '}
                  · <span>{stats.perdus} perdu(s)</span>
                </>
              ) : null}
              {hasActiveFilters ? (
                <>
                  {' '}
                  · <span className="text-slate-700 dark:text-slate-300">{filtered.length} affiché(s)</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <Link
          to="/pigeons/nouveau"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <Plus className="size-4" aria-hidden />
          Nouveau pigeon
        </Link>
      </div>

      {listError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{listError}</div>
      ) : null}

      {!listLoading && hasAnyPigeon ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par matricule, nom, race ou description…"
                className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                aria-label="Recherche textuelle sur les pigeons"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Affichage</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-600" role="group" aria-label="Mode d’affichage">
                <button
                  type="button"
                  onClick={() => setViewModeAndSave('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    viewMode === 'list'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                  aria-pressed={viewMode === 'list'}
                >
                  <LayoutList className="size-4" aria-hidden />
                  Liste
                </button>
                <button
                  type="button"
                  onClick={() => setViewModeAndSave('grid')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                    viewMode === 'grid'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid className="size-4" aria-hidden />
                  Grille
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <label htmlFor="filter-race" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Race
              </label>
              <select
                id="filter-race"
                value={filterRace}
                onChange={(e) => setFilterRace(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
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
              <label htmlFor="filter-sexe" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Sexe
              </label>
              <select
                id="filter-sexe"
                value={filterSexe}
                onChange={(e) => setFilterSexe(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="">Tous</option>
                <option value="MALE">Mâle</option>
                <option value="FEMALE">Femelle</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-statut" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Statut
              </label>
              <select
                id="filter-statut"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              >
                <option value="">Tous les statuts</option>
                <option value="ACTIF">Actif</option>
                <option value={FILTRE_STATUT_EN_COUPLE}>En couple</option>
                <option value="VENDU">Vendu</option>
                <option value="MORT">Mort</option>
                <option value="PERDU">Perdu</option>
                <option value={FILTRE_STATUT_ARCHIVE}>Archivés</option>
              </select>
            </div>
            <div>
              <label htmlFor="sort-by" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                Tri
              </label>
              <div className="flex gap-2">
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortByAndSave(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value="matricule">Matricule</option>
                  <option value="nom">Nom</option>
                  <option value="race">Race</option>
                  <option value="statut">Statut</option>
                </select>
                <button
                  type="button"
                  title={sortDir === 'asc' ? 'Ordre croissant — cliquer pour décroissant' : 'Ordre décroissant — cliquer pour croissant'}
                  onClick={toggleSortDirAndSave}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-2.5 py-2 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:hover:bg-slate-700"
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filtres actifs : la liste ci-dessous est restreinte.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <FilterX className="size-4" aria-hidden />
                Réinitialiser filtres & recherche
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-900 hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              aria-label="Exporter les pigeons affichés au format CSV"
            >
              <Download className="size-4 shrink-0" aria-hidden />
              Exporter CSV (affichage actuel)
            </button>
          </div>
        </div>
      ) : null}

      {listLoading ? (
        <AppLoadingScreen variant="embedded" message="Chargement des pigeons…" subtitle="Récupération des données depuis Firestore." />
      ) : !hasAnyPigeon ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-600 dark:bg-slate-900">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300">
            <Bird className="size-9" strokeWidth={1.5} aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">Aucun pigeon pour l’instant</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
            Commence par enregistrer ton premier pigeon : matricule, sexe, race et date de naissance. Tu
            pourras ensuite l’affecter à une cage depuis la <strong>visualisation</strong>.
          </p>
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-slate-600 dark:text-slate-300">
            <li className="flex gap-2">
              <span className="font-semibold text-teal-600 dark:text-teal-400">1.</span>
              Clique sur « Nouveau pigeon » et remplis le formulaire.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-teal-600 dark:text-teal-400">2.</span>
              Plus tard : couples, reproductions et sorties depuis leurs menus.
            </li>
          </ul>
          <Link
            to="/pigeons/nouveau"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="size-4" aria-hidden />
            Créer un pigeon
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 px-4 py-5 text-center text-sm text-slate-600 dark:text-slate-300 sm:py-6">
          <p className="font-medium text-slate-800 dark:text-slate-100">Aucun pigeon ne correspond à ta sélection.</p>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 dark:text-slate-400">
            Essaie d’autres filtres ou vide la recherche. Le tri et le mode liste / grille restent disponibles.
          </p>
          <button
            type="button"
            className="mt-4 text-teal-700 underline hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200"
            onClick={resetFilters}
          >
            Réinitialiser filtres & recherche
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/[0.04]">
          <div className={dmDataTableHeader}>
            <p className={dmDataTableTitle}>Liste des pigeons</p>
            <p className={dmDataTableSub}>
              Matricule → fiche ; colonnes suivantes → carnet de santé et généalogie.
            </p>
          </div>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-5 lg:grid-cols-3 xl:grid-cols-4">{pigeonCards}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 p-3 sm:gap-4 sm:p-5 md:hidden">{pigeonCards}</div>
              <div className="hidden md:block">
        <div className={dmTableWrap}>
          <table className={dmTableClass('min-w-[720px]')}>
            <thead className={dmThead}>
              <tr>
                <th scope="col" className="w-14 px-2 py-3 font-medium">
                  <span className="sr-only">Photo</span>
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Matricule
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Nom
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Sexe
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Race
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Couples
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Statut
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Carnet santé
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Généalogie
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={dmTbody}>
              {filtered.map((p) => {
                const photoSrc = getPigeonDisplayPhotoSrc(p)
                return (
                  <tr key={p.id} className={dmTrStriped}>
                    <td className="px-2 py-2 align-middle">
                      {photoSrc ? (
                        <img
                          src={photoSrc}
                          alt=""
                          className="size-10 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-600"
                        />
                      ) : (
                        <div
                          className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
                          aria-hidden
                        >
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/pigeons/${p.id}`}
                        state={{ back: LISTE_PIGEONS_BACK }}
                        className="font-mono font-medium text-teal-800 hover:underline dark:text-teal-300"
                      >
                        {p.matricule}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{p.nom}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.sexe === 'MALE' ? 'Mâle' : 'Femelle'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.race}</td>
                    <td className="px-4 py-3 align-middle">
                      <PigeonCoupleBadge pigeon={p} pigeonIdsEnCouplesActifs={pigeonIdsEnCouplesActifs} />
                    </td>
                    <td className="relative max-w-[11rem] overflow-visible px-4 py-3 align-middle">
                      <PigeonStatutSelect
                        pigeon={p}
                        saving={savingStatutId === p.id}
                        onStatutChange={handleStatutChange}
                      />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link
                        to={`/pigeons/${p.id}/sante`}
                        state={{ back: LISTE_PIGEONS_BACK }}
                        className="inline-flex items-center gap-1.5 font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                        title={`Carnet de santé — ${p.matricule}`}
                      >
                        <Stethoscope className="size-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                        <span>Carnet</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link
                        to={`/pigeons/${p.id}/genealogie`}
                        state={{ back: LISTE_PIGEONS_BACK }}
                        className="inline-flex items-center gap-1.5 font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                        title={`Généalogie — ${p.matricule}`}
                      >
                        <GitBranch className="size-4 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                        <span>Arbre</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PigeonActions p={p} onDetail={openDetailDialog} onDelete={openDeleteDialog} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
              </div>
            </>
          )}
        </div>
      )}

      <dialog
        ref={detailDialogRef}
        className="w-[min(32rem,calc(100vw-2rem))] max-w-lg rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-labelledby="pigeon-detail-title"
        onCancel={closeDetailDialog}
      >
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <h2 id="pigeon-detail-title" className="text-lg font-semibold dark:text-slate-100">
            Fiche pigeon
          </h2>
          {detailPigeon ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              <span className="font-mono font-medium text-slate-800 dark:text-slate-100">{detailPigeon.matricule}</span>
              {' — '}
              {detailPigeon.nom}
              <span className="text-slate-500 dark:text-slate-400"> · {detailPigeon.race}</span>
            </p>
          ) : null}
        </div>
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</h3>
          {detailPigeon?.notes?.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">{detailPigeon.notes}</p>
          ) : (
            <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">Aucune description enregistrée pour ce pigeon.</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-700">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={closeDetailDialog}
          >
            Fermer
          </button>
          {detailPigeon ? (
            <Link
              to={`/pigeons/${detailPigeon.id}`}
              state={{ back: LISTE_PIGEONS_BACK }}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              onClick={closeDetailDialog}
            >
              Voir la fiche complète
            </Link>
          ) : null}
        </div>
      </dialog>

      <dialog
        ref={deleteDialogRef}
        className="w-[min(28rem,calc(100vw-2rem))] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-labelledby="delete-pigeon-title"
        onCancel={closeDeleteDialog}
      >
        <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
          <h2 id="delete-pigeon-title" className="text-lg font-semibold dark:text-slate-100">
            Archiver ce pigeon ?
          </h2>
        </div>
        {pendingDelete ? (
          <p className="px-5 py-3 text-sm text-slate-800 dark:text-slate-200">
            <span className="font-mono font-medium">{pendingDelete.matricule}</span> — {pendingDelete.nom}
            <span className="mt-2 block text-xs text-slate-600 dark:text-slate-400">
              Il disparaît de l’effectif mais reste en base (traçabilité, généalogie). Tu pourras le revoir avec le
              filtre Statut « Archivés ».
            </span>
          </p>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3 dark:border-slate-700">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={closeDeleteDialog}
          >
            Annuler
          </button>
          <button
            type="button"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            onClick={confirmDelete}
          >
            Archiver
          </button>
        </div>
      </dialog>
    </div>
  )
}
