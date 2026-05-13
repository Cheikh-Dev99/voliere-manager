import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, GitBranch, Stethoscope } from 'lucide-react'
import { obtenirPigeon } from '@shared/services/pigeonsService'
import { CageGenealogyView } from '../features/voliere/CageGenealogyView'
import { getPigeonDisplayPhotoSrc } from '../utils/localPigeonPhoto'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'

const DEFAULT_BACK = { path: '/pigeons', label: 'Liste des pigeons' }

/** Charge le pigeon racine et tous les ascendants nécessaires à l’arbre (même logique que la vue cage, max 2 générations). */
async function fetchGenealogyPigeonMap(rootId, maxGen = 2) {
  const map = new Map()
  let level = [{ id: rootId, g: 0 }]
  while (level.length) {
    const ids = [...new Set(level.map((x) => x.id).filter(Boolean))]
    const results = await Promise.all(ids.map((id) => obtenirPigeon(id)))
    for (let i = 0; i < ids.length; i++) {
      const p = results[i]
      if (p) map.set(ids[i], p)
    }
    const next = []
    for (const { id, g } of level) {
      const p = map.get(id)
      if (!p || g >= maxGen) continue
      if (p.pereId) next.push({ id: p.pereId, g: g + 1 })
      if (p.mereId) next.push({ id: p.mereId, g: g + 1 })
    }
    level = next
  }
  return map
}

/**
 * Généalogie ascendante d’un pigeon — même présentation que l’onglet cage (liée au pigeon, pas à la cage).
 */
export function PigeonGenealogyPage() {
  const { pigeonId } = useParams()
  const location = useLocation()
  const rawBack = location.state?.back
  const back =
    rawBack && typeof rawBack.path === 'string' && typeof rawBack.label === 'string'
      ? rawBack
      : DEFAULT_BACK

  const [pigeon, setPigeon] = useState(null)
  const [pigeonById, setPigeonById] = useState(() => new Map())
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
        const map = await fetchGenealogyPigeonMap(p.id, 2)
        if (!alive) return
        setPigeonById(map)
      } catch (e) {
        if (alive) setError(e?.message ?? 'Impossible de charger la généalogie')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [pigeonId])

  const miniCardLinkState = useMemo(
    () =>
      pigeonId
        ? { back: { path: `/pigeons/${pigeonId}/genealogie`, label: 'Généalogie' } }
        : undefined,
    [pigeonId],
  )

  if (loading) {
    return (
      <AppLoadingScreen variant="embedded" message="Chargement…" subtitle="Lignée ascendante et fiches liées." />
    )
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to={`/pigeons/${pigeon.id}`}
          state={location.state}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour à la fiche
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-start gap-4">
            {photoSrc ? (
              <img src={photoSrc} alt="" className="size-16 shrink-0 rounded-xl border border-slate-100 object-cover" />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
                —
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
                <GitBranch className="size-7 shrink-0 text-teal-600" aria-hidden />
                Généalogie
              </h1>
              <p className="mt-1 font-mono text-sm font-semibold text-teal-900">{pigeon.matricule}</p>
              <p className="text-sm text-slate-600">
                {pigeon.nom} · {pigeon.race}
              </p>
            </div>
          </div>
          <Link
            to={`/pigeons/${pigeon.id}/sante`}
            state={location.state}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-medium text-teal-900 shadow-sm hover:bg-teal-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            <Stethoscope className="size-4" aria-hidden />
            Carnet de santé
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Lignée ascendante jusqu’aux grands-parents lorsque les fiches sont renseignées — même vue que depuis une cage,
          accessible ici pour tout pigeon.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <CageGenealogyView
          mode="solo"
          pigeon={pigeon}
          pigeonById={pigeonById}
          pigeonDetailLinkState={miniCardLinkState}
        />
      </section>
    </div>
  )
}
