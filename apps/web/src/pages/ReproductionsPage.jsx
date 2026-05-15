import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Egg,
  FilterX,
  Plus,
  Search,
} from 'lucide-react'
import { useReproductions } from '@shared/hooks/useReproductions'
import { useCouples } from '@shared/hooks/useCouples'
import { usePigeons } from '@shared/hooks/usePigeons'
import { tsMillis } from '@shared/hooks/firestoreClientSort'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'
import {
  dmDataTableCard,
  dmDataTableHeader,
  dmDataTableSub,
  dmDataTableTitle,
  dmFilterResetRow,
  dmGhostButton,
  dmLabelXs,
  dmTableClass,
  dmTableWrap,
  dmThead,
  dmTbody,
  dmTrStriped,
} from '../theme/voliereDarkUi'

/** État « Retour » pour les fiches pigeon ouvertes depuis cette liste. */
export const LISTE_REPRODUCTIONS_BACK = {
  path: '/reproductions',
  label: 'Liste des reproductions',
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

function parseRangeStartMs(isoDate) {
  if (!isoDate?.trim()) return null
  const t = new Date(`${isoDate.trim()}T00:00:00`).getTime()
  return Number.isNaN(t) ? null : t
}

function parseRangeEndMs(isoDate) {
  if (!isoDate?.trim()) return null
  const t = new Date(`${isoDate.trim()}T23:59:59.999`).getTime()
  return Number.isNaN(t) ? null : t
}

export function ReproductionsPage() {
  const { reproductions, loading, error } = useReproductions()
  const { couples, loading: lc } = useCouples(false)
  const { pigeons, loading: lp } = usePigeons(false)

  const [query, setQuery] = useState('')
  const [filterCoupleId, setFilterCoupleId] = useState('')
  const [datePonteFrom, setDatePonteFrom] = useState('')
  const [datePonteTo, setDatePonteTo] = useState('')
  const [sortBy, setSortBy] = useState('datePonte')
  const [sortDir, setSortDir] = useState('desc')

  const coupleById = useMemo(() => {
    const m = new Map()
    for (const c of couples) m.set(c.id, c)
    return m
  }, [couples])

  const pigeonById = useMemo(() => {
    const m = new Map()
    for (const p of pigeons) m.set(p.id, p)
    return m
  }, [pigeons])

  function coupleLabel(coupleId) {
    const c = coupleById.get(coupleId)
    if (!c) return '—'
    const m = pigeonById.get(c.maleId)
    const f = pigeonById.get(c.femelleId)
    const a = m?.matricule ?? '?'
    const b = f?.matricule ?? '?'
    return `${a} + ${b}`
  }

  const coupleIdsInData = useMemo(() => {
    const s = new Set()
    for (const r of reproductions) {
      if (r.coupleId) s.add(r.coupleId)
    }
    return [...s].sort((a, b) => coupleLabel(a).localeCompare(coupleLabel(b), 'fr', { numeric: true }))
  }, [reproductions, coupleById, pigeonById])

  const qNorm = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    const fromMs = parseRangeStartMs(datePonteFrom)
    const toMs = parseRangeEndMs(datePonteTo)

    let rows = reproductions.filter((r) => {
      if (filterCoupleId && r.coupleId !== filterCoupleId) return false

      const ponteMs = tsMillis(r.datePonte)
      if (fromMs !== null && ponteMs < fromMs) return false
      if (toMs !== null && ponteMs > toMs) return false

      if (!qNorm) return true
      const c = coupleById.get(r.coupleId)
      const m = c ? pigeonById.get(c.maleId) : null
      const f = c ? pigeonById.get(c.femelleId) : null
      const hay = [
        m?.matricule,
        m?.nom,
        f?.matricule,
        f?.nom,
        coupleLabel(r.coupleId),
        r.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(qNorm)
    })

    const dir = sortDir === 'asc' ? 1 : -1
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'couple') {
        const la = coupleLabel(a.coupleId)
        const lb = coupleLabel(b.coupleId)
        const cmp = la.localeCompare(lb, 'fr', { numeric: true })
        if (cmp !== 0) return cmp * dir
      }
      const ta = tsMillis(a.datePonte)
      const tb = tsMillis(b.datePonte)
      return (ta - tb) * dir
    })

    return rows
  }, [
    reproductions,
    filterCoupleId,
    datePonteFrom,
    datePonteTo,
    qNorm,
    coupleById,
    pigeonById,
    sortBy,
    sortDir,
  ])

  const hasActiveFilters =
    Boolean(query.trim()) ||
    Boolean(filterCoupleId) ||
    Boolean(datePonteFrom) ||
    Boolean(datePonteTo)

  function resetFilters() {
    setQuery('')
    setFilterCoupleId('')
    setDatePonteFrom('')
    setDatePonteTo('')
  }

  function toggleSortDir() {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  }

  const busy = loading || lc || lp

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50 sm:text-2xl">Reproductions</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Portées enregistrées pour tes couples. Crée une fiche depuis un couple actif ou depuis ce bouton.
          </p>
        </div>
        <Link
          to="/reproductions/nouveau"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700"
        >
          <Plus className="size-4" aria-hidden />
          Nouvelle reproduction
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>
      ) : null}

      {busy ? (
        <AppLoadingScreen variant="embedded" loadingContext="reproduction" message="Chargement des reproductions…" />
      ) : reproductions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-600 dark:bg-slate-900">
          <Egg className="mx-auto size-12 text-slate-300" aria-hidden />
          <p className="mt-3 text-slate-700 dark:text-slate-200">Aucune reproduction enregistrée.</p>
          <Link
            to="/reproductions/nouveau"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Plus className="size-4" aria-hidden />
            Enregistrer une première portée
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-3 shadow-sm sm:p-4">
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
                  placeholder="Matricules, noms, notes de portée…"
                  className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  aria-label="Recherche sur les reproductions"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {filtered.length} / {reproductions.length} ligne{filtered.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label htmlFor="rep-filter-couple" className={dmLabelXs}>
                  Couple
                </label>
                <select
                  id="rep-filter-couple"
                  value={filterCoupleId}
                  onChange={(e) => setFilterCoupleId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                >
                  <option value="">Tous les couples</option>
                  {coupleIdsInData.map((id) => (
                    <option key={id} value={id}>
                      {coupleLabel(id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rep-from" className={dmLabelXs}>
                  Ponte du
                </label>
                <input
                  id="rep-from"
                  type="date"
                  value={datePonteFrom}
                  onChange={(e) => setDatePonteFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
              <div>
                <label htmlFor="rep-to" className={dmLabelXs}>
                  Ponte au
                </label>
                <input
                  id="rep-to"
                  type="date"
                  value={datePonteTo}
                  onChange={(e) => setDatePonteTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
              <div>
                <label htmlFor="rep-sort" className={dmLabelXs}>
                  Tri
                </label>
                <div className="flex gap-2">
                  <select
                    id="rep-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="datePonte">Date de ponte</option>
                    <option value="couple">Couple (matricules)</option>
                  </select>
                  <button
                    type="button"
                    title={
                      sortDir === 'asc'
                        ? 'Ordre croissant — cliquer pour décroissant'
                        : 'Ordre décroissant — cliquer pour croissant'
                    }
                    onClick={toggleSortDir}
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
              <div className={`mt-3 ${dmFilterResetRow}`}>
                <p className="text-xs text-slate-500 dark:text-slate-400">Filtres actifs — résultats restreints.</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className={dmGhostButton}
                >
                  <FilterX className="size-4" aria-hidden />
                  Réinitialiser filtres & recherche
                </button>
              </div>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 px-4 py-8 text-center text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-100">Aucune portée ne correspond à ta sélection.</p>
              <button
                type="button"
                className="mt-3 text-teal-700 underline hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-200"
                onClick={resetFilters}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className={dmDataTableCard}>
              <div className={dmDataTableHeader}>
                <p className={dmDataTableTitle}>Portées enregistrées</p>
                <p className={dmDataTableSub}>Une ligne par reproduction (couple, dates, effectifs).</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 md:hidden">
                {filtered.map((r) => {
                  const c = coupleById.get(r.coupleId)
                  const male = c ? pigeonById.get(c.maleId) : null
                  const femelle = c ? pigeonById.get(c.femelleId) : null
                  return (
                    <article
                      key={r.id}
                      className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm dark:border-slate-600 dark:bg-slate-800/80"
                    >
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        Ponte {formatDate(r.datePonte)}
                      </p>
                      <div className="mt-2 min-w-0">
                        {c && male && femelle ? (
                          <div className="flex flex-wrap items-center gap-x-1 font-mono text-[10px] font-semibold">
                            <Link
                              to={`/pigeons/${male.id}`}
                              state={{ back: LISTE_REPRODUCTIONS_BACK }}
                              className="text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                            >
                              {male.matricule}
                            </Link>
                            <span className="text-slate-400" aria-hidden>
                              +
                            </span>
                            <Link
                              to={`/pigeons/${femelle.id}`}
                              state={{ back: LISTE_REPRODUCTIONS_BACK }}
                              className="text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                            >
                              {femelle.matricule}
                            </Link>
                          </div>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">{coupleLabel(r.coupleId)}</span>
                        )}
                      </div>
                      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-700 dark:text-slate-200">
                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">Œufs</dt>
                          <dd className="font-medium">{r.nombreOeufs}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500 dark:text-slate-400">Jeunes</dt>
                          <dd className="font-medium">{r.nombrePigeonneaux}</dd>
                        </div>
                      </dl>
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                        Éclosion {formatDate(r.dateEclosion)}
                      </p>
                    </article>
                  )
                })}
              </div>
              <div className="hidden md:block">
              <div className={dmTableWrap}>
              <table className={dmTableClass('min-w-[640px]')}>
                <thead className={dmThead}>
                  <tr>
                    <th className="px-4 py-3">Date ponte</th>
                    <th className="px-4 py-3">Parents</th>
                    <th className="px-4 py-3">Œufs</th>
                    <th className="px-4 py-3">Jeunes</th>
                    <th className="px-4 py-3">Éclosion</th>
                  </tr>
                </thead>
                <tbody className={dmTbody}>
                  {filtered.map((r) => {
                    const c = coupleById.get(r.coupleId)
                    const male = c ? pigeonById.get(c.maleId) : null
                    const femelle = c ? pigeonById.get(c.femelleId) : null
                    return (
                      <tr key={r.id} className={dmTrStriped}>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">{formatDate(r.datePonte)}</td>
                        <td className="px-4 py-3">
                          {c && male && femelle ? (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs sm:text-sm">
                              <Link
                                to={`/pigeons/${male.id}`}
                                state={{ back: LISTE_REPRODUCTIONS_BACK }}
                                className="font-semibold text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                                title={`Fiche ${male.matricule}`}
                              >
                                {male.matricule}
                              </Link>
                              <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                                +
                              </span>
                              <Link
                                to={`/pigeons/${femelle.id}`}
                                state={{ back: LISTE_REPRODUCTIONS_BACK }}
                                className="font-semibold text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                                title={`Fiche ${femelle.matricule}`}
                              >
                                {femelle.matricule}
                              </Link>
                            </div>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">{coupleLabel(r.coupleId)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{r.nombreOeufs}</td>
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{r.nombrePigeonneaux}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(r.dateEclosion)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
