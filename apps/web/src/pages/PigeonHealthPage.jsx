import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, GitBranch, Stethoscope } from 'lucide-react'
import { usePigeonHealthHistory } from '@shared/hooks/usePigeonHealthHistory'
import { ajouterEvenementSante } from '@shared/services/pigeonHealthService'
import { obtenirPigeon } from '@shared/services/pigeonsService'
import { getPigeonDisplayPhotoSrc } from '../utils/localPigeonPhoto'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'
import { dmFieldClass, dmFormShell, dmLabelXs } from '../theme/voliereDarkUi'

const DEFAULT_BACK = { path: '/pigeons', label: 'Liste des pigeons' }

function formatCalendarDate(ts) {
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

/**
 * Carnet de santé d’un pigeon — consultations, soins, observations (sous-collection Firestore).
 */
export function PigeonHealthPage() {
  const { pigeonId } = useParams()
  const location = useLocation()
  const rawBack = location.state?.back
  const back =
    rawBack && typeof rawBack.path === 'string' && typeof rawBack.label === 'string'
      ? rawBack
      : DEFAULT_BACK

  const [pigeon, setPigeon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState('')
  const [detail, setDetail] = useState('')
  const [occDate, setOccDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!pigeonId) return
      setLoading(true)
      setError(null)
      try {
        const p = await obtenirPigeon(pigeonId)
        if (!alive) return
        if (!p) {
          setPigeon(null)
          setError('Pigeon introuvable.')
          return
        }
        setPigeon(p)
      } catch (e) {
        if (alive) setError(e?.message ?? 'Impossible de charger le pigeon')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [pigeonId])

  const { mergedSorted: events, loading: eventsLoading, error: eventsError } = usePigeonHealthHistory(
    pigeon ? [pigeon.id] : [],
  )

  const handleSave = useCallback(async () => {
    const s = summary.trim()
    if (!s) {
      toast.error('Résumé obligatoire.')
      return
    }
    if (!pigeonId) return
    setSaving(true)
    try {
      await ajouterEvenementSante(pigeonId, {
        summary: s,
        detail: detail.trim(),
        occurredAt: occDate ? new Date(`${occDate}T12:00:00`) : undefined,
      })
      toast.success('Entrée enregistrée.')
      setSummary('')
      setDetail('')
    } catch (e) {
      toast.error(e?.message || 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }, [summary, detail, occDate, pigeonId])

  if (loading) {
    return <AppLoadingScreen variant="embedded" message="Chargement…" subtitle="Fiche pigeon et carnet santé." />
  }

  if (error || !pigeon) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-center text-sm text-red-800">
        <p className="font-medium">{error ?? 'Pigeon introuvable.'}</p>
        <Link to={back.path} className="mt-4 inline-block text-teal-700 underline hover:text-teal-900">
          {back.label}
        </Link>
      </div>
    )
  }

  const photoSrc = getPigeonDisplayPhotoSrc(pigeon)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to={`/pigeons/${pigeon.id}`}
          state={location.state}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour à la fiche
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-start gap-4">
            {photoSrc ? (
              <img src={photoSrc} alt="" className="size-16 shrink-0 rounded-xl border border-slate-100 object-cover dark:border-slate-600" />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500">
                —
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
                <Stethoscope className="size-7 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                Carnet de santé
              </h1>
              <p className="mt-1 font-mono text-sm font-semibold text-teal-900 dark:text-teal-200">{pigeon.matricule}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {pigeon.nom} · {pigeon.race}
              </p>
            </div>
          </div>
          <Link
            to={`/pigeons/${pigeon.id}/genealogie`}
            state={location.state}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-900 shadow-sm hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900/50"
          >
            <GitBranch className="size-4" aria-hidden />
            Généalogie
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Historique lié à ce pigeon (consultations, traitements, observations). Les entrées restent sur sa fiche,
          indépendamment des cages.
        </p>
      </div>

      <section className={dmFormShell}>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nouvelle entrée</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="ph-occurred" className={dmLabelXs}>
              Date de l’événement
            </label>
            <input
              id="ph-occurred"
              type="date"
              value={occDate}
              onChange={(e) => setOccDate(e.target.value)}
              className={`max-w-xs ${dmFieldClass(false)}`}
            />
          </div>
          <div>
            <label htmlFor="ph-summary" className={dmLabelXs}>
              Résumé (obligatoire)
            </label>
            <input
              id="ph-summary"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ex. Vermifuge, consultation…"
              className={dmFieldClass(false)}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="ph-detail" className={dmLabelXs}>
              Détail (optionnel)
            </label>
            <textarea
              id="ph-detail"
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Dosage, symptômes…"
              className={dmFieldClass(false)}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !summary.trim()}
            className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Ajouter au carnet'}
          </button>
        </div>
      </section>

      <section className={dmFormShell}>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Historique</h2>
        {eventsError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {eventsError}
          </p>
        ) : null}
        {eventsLoading ? (
          <div className="mt-4 space-y-2" aria-busy="true">
            <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : events.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Aucune entrée pour l’instant.</p>
        ) : (
          <ul className="mt-4 max-h-[min(50vh,24rem)] space-y-2 overflow-y-auto pr-1">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800/80"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {formatCalendarDate(ev.occurredAt)}
                </p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">{ev.summary}</p>
                {ev.detail?.trim() ? (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{ev.detail.trim()}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
