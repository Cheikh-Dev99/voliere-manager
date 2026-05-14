import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, FilterX, Loader2, ScrollText, Trash2 } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@shared/firebase/config'
import { COLLECTIONS } from '@shared/firebase/collections'
import {
  deleteAllCageOccupancyEvents,
  deleteCageOccupancyEvent,
  fetchCageOccupancyEvents,
} from '@shared/services/cagesService'

const REASON_OPTIONS = [
  { value: '', label: 'Non précisé' },
  { value: 'VENTE', label: 'Vente / sortie définitive' },
  { value: 'AUTRE_CAGE', label: 'Autre cage (hors couple)' },
  { value: 'MISE_EN_COUPLE', label: 'Mise en couple ailleurs' },
  { value: 'SOIN', label: 'Soin / isolement' },
  { value: 'NETTOYAGE', label: 'Nettoyage / rotation' },
  { value: 'AUTRE', label: 'Autre' },
]

const OCC_KIND_LABELS = {
  assign_pigeon: 'Affectation (1 pigeon)',
  assign_couple: 'Affectation (couple)',
  release: 'Libération',
  move_pigeon_out: 'Déplacement pigeon (sortie)',
  move_pigeon_in: 'Déplacement pigeon (entrée)',
  move_couple_out: 'Déplacement couple (sortie)',
  move_couple_in: 'Déplacement couple (entrée)',
}

function formatEventTime(ts) {
  if (!ts || typeof ts.toDate !== 'function') return ''
  try {
    return ts.toDate().toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function reasonDisplay(code, detail) {
  const hasDetail = Boolean(detail?.trim())
  const opt = code ? REASON_OPTIONS.find((o) => o.value === code) : null
  const base = opt?.label ?? null
  if (!base && !hasDetail) return null
  return (
    <p className="mt-1 text-xs text-slate-500">
      {base ? <span className="font-medium text-slate-600">{base}</span> : null}
      {detail?.trim() ? (
        <span className="mt-0.5 block italic">{detail.trim()}</span>
      ) : null}
    </p>
  )
}

function eventTimestampMs(ev) {
  try {
    const d = ev.createdAt?.toDate?.()
    return d instanceof Date ? d.getTime() : 0
  } catch {
    return 0
  }
}

function startOfDayMs(yyyyMmDd) {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0)
  return Number.isNaN(dt.getTime()) ? null : dt.getTime()
}

function endOfDayMs(yyyyMmDd) {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null
  const [y, m, d] = yyyyMmDd.split('-').map(Number)
  const dt = new Date(y, m - 1, d, 23, 59, 59, 999)
  return Number.isNaN(dt.getTime()) ? null : dt.getTime()
}

/**
 * Historique des mouvements d’une cage : plein écran, filtres, suppression unitaire ou totale.
 */
export function CageHistoryFullPage() {
  const { cageId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const back = location.state?.back ?? { path: '/', label: 'Retour' }

  const [cageNumero, setCageNumero] = useState('')
  const [cageVoliere, setCageVoliere] = useState('')
  const [cageMissing, setCageMissing] = useState(false)

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [deletingId, setDeletingId] = useState(null)
  const [purging, setPurging] = useState(false)

  const reload = useCallback(async () => {
    if (!cageId) return
    setLoading(true)
    setLoadError(null)
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.CAGES, cageId))
      if (!snap.exists()) {
        setCageMissing(true)
        setEvents([])
        return
      }
      const data = snap.data()
      setCageMissing(false)
      setCageNumero(String(data.numero ?? ''))
      setCageVoliere(String(data.voliereCode ?? 'A'))
      const rows = await fetchCageOccupancyEvents(cageId, 500)
      setEvents(rows)
    } catch (e) {
      setLoadError(e?.message ?? 'Chargement impossible')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [cageId])

  useEffect(() => {
    void reload()
  }, [reload])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromMs = startOfDayMs(dateFrom)
    const toMs = endOfDayMs(dateTo)

    return events.filter((ev) => {
      if (kindFilter !== 'ALL' && ev.kind !== kindFilter) return false
      const t = eventTimestampMs(ev)
      if (fromMs != null && t < fromMs) return false
      if (toMs != null && t > toMs) return false
      if (!q) return true
      const hay = [
        ev.summary,
        ev.reasonDetail ?? '',
        OCC_KIND_LABELS[ev.kind] ?? ev.kind,
        ev.pigeonId ?? '',
        ev.coupleId ?? '',
        ev.otherCageLabel ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [events, search, kindFilter, dateFrom, dateTo])

  const hasActiveFilters =
    search.trim() !== '' || kindFilter !== 'ALL' || Boolean(dateFrom) || Boolean(dateTo)

  const resetFilters = useCallback(() => {
    setSearch('')
    setKindFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }, [])

  const handleDeleteOne = useCallback(
    async (eventId) => {
      if (!cageId || !eventId) return
      if (!window.confirm('Supprimer cet événement de l’historique ? Cette action est définitive.')) return
      setDeletingId(eventId)
      try {
        await deleteCageOccupancyEvent(cageId, eventId)
        setEvents((prev) => prev.filter((e) => e.id !== eventId))
        toast.success('Événement supprimé')
      } catch (e) {
        toast.error(e?.message ?? 'Suppression impossible')
      } finally {
        setDeletingId(null)
      }
    },
    [cageId],
  )

  const handleDeleteAll = useCallback(async () => {
    if (!cageId) return
    if (
      !window.confirm(
        'Supprimer tout l’historique des mouvements de cette cage ? Les entrées seront effacées définitivement (plusieurs lots si besoin).',
      )
    ) {
      return
    }
    setPurging(true)
    try {
      const n = await deleteAllCageOccupancyEvents(cageId)
      setEvents([])
      toast.success(n > 0 ? `${n} événement(s) supprimé(s)` : 'Historique déjà vide')
    } catch (e) {
      toast.error(e?.message ?? 'Suppression impossible')
    } finally {
      setPurging(false)
    }
  }, [cageId])

  const titreCage =
    cageNumero && !cageMissing ? `${cageVoliere} · ${cageNumero}` : cageMissing ? 'Cage introuvable' : '…'

  return (
    <div className="flex min-h-dvh w-full max-w-none flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 w-full shrink-0 border-b border-slate-200/90 bg-white/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:px-6 lg:px-10">
        <div className="flex w-full flex-wrap items-center gap-3">
          <Link
            to={back.path}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            {back.label}
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-slate-900">Historique complet</h1>
            <p className="truncate text-sm text-slate-500">Cage {titreCage}</p>
          </div>
          {!cageMissing && cageId ? (
            <button
              type="button"
              onClick={() => void handleDeleteAll()}
              disabled={purging || loading}
              className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50 sm:text-sm"
            >
              {purging ? 'Suppression…' : 'Tout supprimer'}
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex w-full min-w-0 flex-1 flex-col overflow-y-auto bg-white">
        <div className="w-full border-b border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[min(100%,14rem)] flex-1">
              <label htmlFor="cage-hist-search" className="mb-1 block text-xs font-medium text-slate-600">
                Recherche
              </label>
              <input
                id="cage-hist-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Résumé, raison, ID…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25"
                autoComplete="off"
              />
            </div>
            <div className="min-w-[10rem]">
              <label htmlFor="cage-hist-kind" className="mb-1 block text-xs font-medium text-slate-600">
                Type d’événement
              </label>
              <select
                id="cage-hist-kind"
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25"
              >
                <option value="ALL">Tous</option>
                {Object.entries(OCC_KIND_LABELS).map(([k, lab]) => (
                  <option key={k} value={k}>
                    {lab}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cage-hist-from" className="mb-1 block text-xs font-medium text-slate-600">
                Du
              </label>
              <input
                id="cage-hist-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full min-w-[10.5rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25"
              />
            </div>
            <div>
              <label htmlFor="cage-hist-to" className="mb-1 block text-xs font-medium text-slate-600">
                Au
              </label>
              <input
                id="cage-hist-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full min-w-[10.5rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25"
              />
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <FilterX className="size-4 shrink-0" aria-hidden />
                Réinitialiser
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Jusqu’à <strong>500</strong> entrées les plus récentes. Les filtres s’appliquent sur cette liste.
          </p>
        </div>

        <div className="flex-1 px-4 py-6 sm:px-8 lg:px-12">
          {cageMissing ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-950">
              <p>Cette cage n’existe pas ou tu n’y as pas accès.</p>
              <button
                type="button"
                onClick={() => navigate(back.path, { replace: true })}
                className="mt-4 text-sm font-semibold text-teal-800 underline"
              >
                Revenir à l’app
              </button>
            </div>
          ) : null}

          {!cageMissing && loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-600">
              <Loader2 className="size-8 animate-spin" aria-hidden />
              <p className="text-sm">Chargement de l’historique…</p>
            </div>
          ) : null}

          {!cageMissing && !loading && loadError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p>
          ) : null}

          {!cageMissing && !loading && !loadError && filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
              <ScrollText className="mx-auto mb-3 size-10 text-slate-400" aria-hidden />
              <p className="text-sm font-medium text-slate-700">
                {events.length === 0
                  ? 'Aucun événement enregistré pour cette cage.'
                  : 'Aucun résultat avec les filtres actuels.'}
              </p>
            </div>
          ) : null}

          {!cageMissing && !loading && !loadError && filtered.length > 0 ? (
            <ul className="space-y-3 pb-8">
              {filtered.map((ev) => (
                <li
                  key={ev.id}
                  className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-3 sm:px-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {formatEventTime(ev.createdAt)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-teal-800">
                      {OCC_KIND_LABELS[ev.kind] ?? ev.kind}
                    </p>
                    <p className="mt-1 text-sm text-slate-800">{ev.summary}</p>
                    {reasonDisplay(ev.reasonCode, ev.reasonDetail)}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteOne(ev.id)}
                    disabled={deletingId === ev.id || purging}
                    className="shrink-0 self-start rounded-lg border border-red-100 bg-white p-2 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Supprimer cet événement"
                    title="Supprimer"
                  >
                    {deletingId === ev.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-4" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {!cageMissing && !loading && !loadError ? (
          <footer className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 text-xs text-slate-600 backdrop-blur sm:px-8 lg:px-12">
            {filtered.length} affiché(s) sur {events.length} chargé(s)
            {hasActiveFilters ? ' (filtres actifs)' : null}
          </footer>
        ) : null}
      </main>
    </div>
  )
}
