import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Bird, ClipboardList, GitBranch, Pencil, Stethoscope } from 'lucide-react'
import { obtenirPigeon } from '@shared/services/pigeonsService'
import { getPigeonDisplayPhotoSrc } from '../utils/localPigeonPhoto'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'

const STATUT_BADGE = {
  ACTIF: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  VENDU: 'border-slate-200 bg-slate-100 text-slate-800',
  MORT: 'border-zinc-200 bg-zinc-100 text-zinc-800',
  PERDU: 'border-amber-200 bg-amber-50 text-amber-950',
}

const STATUT_LABEL = {
  ACTIF: 'Actif',
  VENDU: 'Vendu',
  MORT: 'Mort',
  PERDU: 'Perdu',
}

function formatDateNaissance(ts) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  try {
    return ts.toDate().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * Fiche pigeon — consultation seule ; modification via « Modifier la fiche ».
 */
/** État passé par les liens (ex. depuis Couples) pour le lien « Retour ». */
const DEFAULT_BACK = { path: '/pigeons', label: 'Liste des pigeons' }

export function PigeonDetailPage() {
  const { pigeonId } = useParams()
  const location = useLocation()
  const rawBack = location.state?.back
  const back =
    rawBack &&
    typeof rawBack.path === 'string' &&
    typeof rawBack.label === 'string'
      ? rawBack
      : DEFAULT_BACK
  const [pigeon, setPigeon] = useState(null)
  const [pere, setPere] = useState(null)
  const [mere, setMere] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        const [pr, mr] = await Promise.all([
          p.pereId ? obtenirPigeon(p.pereId) : Promise.resolve(null),
          p.mereId ? obtenirPigeon(p.mereId) : Promise.resolve(null),
        ])
        if (!alive) return
        setPere(pr)
        setMere(mr)
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

  const description =
    pigeon && typeof pigeon.description === 'string' ? pigeon.description.trim() : ''

  if (loading) {
    return <AppLoadingScreen variant="embedded" message="Chargement du pigeon…" subtitle="Lecture de la fiche et des données liées." />
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={back.path}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-slate-900">
            <Bird className="size-8 shrink-0 text-teal-600" aria-hidden />
            <span className="font-mono">{pigeon.matricule}</span>
            <span className="text-slate-700">— {pigeon.nom}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Fiche en lecture seule. Utilise le bouton ci-dessous pour modifier les données.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            to={`/pigeons/${pigeon.id}/sante`}
            state={location.state}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-900 shadow-sm hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            <Stethoscope className="size-4" aria-hidden />
            Carnet de santé
          </Link>
          <Link
            to={`/pigeons/${pigeon.id}/genealogie`}
            state={location.state}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-900 shadow-sm hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            <GitBranch className="size-4" aria-hidden />
            Généalogie
          </Link>
          {pigeon.statut === 'ACTIF' && !pigeon.deletedAt ? (
            <Link
              to={`/sorties?pigeon=${encodeURIComponent(pigeon.id)}`}
              state={location.state}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            >
              <ClipboardList className="size-4" aria-hidden />
              Enregistrer une sortie
            </Link>
          ) : null}
          <Link
            to={`/pigeons/${pigeon.id}/modifier`}
            state={location.state}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            <Pencil className="size-4" aria-hidden />
            Modifier la fiche
          </Link>
        </div>
      </div>

      {pigeon.deletedAt ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Ce pigeon a été retiré de l’effectif actif (données conservées pour la traçabilité).
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,14rem)_1fr]">
          <div className="flex justify-center md:justify-start">
            {photoSrc ? (
              <img
                src={photoSrc}
                alt=""
                className="size-48 rounded-2xl border border-slate-100 object-cover shadow-inner"
              />
            ) : (
              <div className="flex size-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Sans photo
              </div>
            )}
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sexe</dt>
              <dd className="mt-1 text-slate-900">{pigeon.sexe === 'MALE' ? 'Mâle' : 'Femelle'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUT_BADGE[pigeon.statut] ?? 'border-slate-200 bg-slate-100'}`}
                >
                  {STATUT_LABEL[pigeon.statut] ?? pigeon.statut}
                </span>
                <Link
                  to={`/pigeons/${pigeon.id}/sante`}
                  state={location.state}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
                >
                  <Stethoscope className="size-3.5 shrink-0" aria-hidden />
                  Carnet de santé
                </Link>
                <Link
                  to={`/pigeons/${pigeon.id}/genealogie`}
                  state={location.state}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
                >
                  <GitBranch className="size-3.5 shrink-0" aria-hidden />
                  Généalogie
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Race</dt>
              <dd className="mt-1 text-slate-900">{pigeon.race}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Couleur</dt>
              <dd className="mt-1 text-slate-900">{pigeon.couleur}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date de naissance</dt>
              <dd className="mt-1 text-slate-900">{formatDateNaissance(pigeon.dateNaissance)}</dd>
            </div>
            {(pigeon.pereId || pigeon.mereId) && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Généalogie</dt>
                <dd className="mt-2 flex flex-wrap gap-4 text-sm">
                  {pigeon.pereId ? (
                    <span>
                      <span className="text-slate-500">Père : </span>
                      {pere ? (
                        <Link
                          to={`/pigeons/${pere.id}`}
                          state={location.state}
                          className="font-mono font-medium text-teal-800 underline-offset-2 hover:underline"
                        >
                          {pere.matricule}
                        </Link>
                      ) : (
                        <span className="font-mono text-slate-600">{pigeon.pereId}</span>
                      )}
                      {pere ? <span className="text-slate-600"> — {pere.nom}</span> : null}
                    </span>
                  ) : null}
                  {pigeon.mereId ? (
                    <span>
                      <span className="text-slate-500">Mère : </span>
                      {mere ? (
                        <Link
                          to={`/pigeons/${mere.id}`}
                          state={location.state}
                          className="font-mono font-medium text-teal-800 underline-offset-2 hover:underline"
                        >
                          {mere.matricule}
                        </Link>
                      ) : (
                        <span className="font-mono text-slate-600">{pigeon.mereId}</span>
                      )}
                      {mere ? <span className="text-slate-600"> — {mere.nom}</span> : null}
                    </span>
                  ) : null}
                </dd>
              </div>
            )}
            {pigeon.notes?.trim() ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-800">{pigeon.notes}</dd>
              </div>
            ) : null}
            {description ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-800">{description}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>
    </div>
  )
}
