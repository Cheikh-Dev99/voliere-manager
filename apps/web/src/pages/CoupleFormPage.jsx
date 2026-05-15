import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { usePigeons } from '@shared/hooks/usePigeons'
import { useCages } from '@shared/hooks/useCages'
import { useCouples } from '@shared/hooks/useCouples'
import { creerCouple } from '@shared/services/couplesService'
import { CoupleSchema } from '@shared/validators/schemas'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'
import { dmFieldClass as fieldClass, dmFormShellCompact, dmLabelSm } from '../theme/voliereDarkUi'

/**
 * Création d’un couple (mâle + femelle actifs, cage libre optionnelle).
 */
export function CoupleFormPage() {
  const navigate = useNavigate()
  const { pigeons, loading: loadPigeons } = usePigeons(false)
  const { cages, loading: loadCages } = useCages()
  const { couples, loading: loadCouples } = useCouples(true)

  const idsDansCoupleActif = useMemo(() => {
    const s = new Set()
    for (const c of couples) {
      s.add(c.maleId)
      s.add(c.femelleId)
    }
    return s
  }, [couples])

  const malesChoix = useMemo(
    () =>
      pigeons.filter(
        (p) => p.sexe === 'MALE' && p.statut === 'ACTIF' && !idsDansCoupleActif.has(p.id),
      ),
    [pigeons, idsDansCoupleActif],
  )

  const femellesChoix = useMemo(
    () =>
      pigeons.filter(
        (p) => p.sexe === 'FEMALE' && p.statut === 'ACTIF' && !idsDansCoupleActif.has(p.id),
      ),
    [pigeons, idsDansCoupleActif],
  )

  const cagesLibres = useMemo(() => cages.filter((c) => c.statut === 'LIBRE'), [cages])

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      maleId: '',
      femelleId: '',
      dateDebut: '',
      cageId: '',
      notes: '',
    },
  })

  const onSubmit = async (values) => {
    clearErrors()
    const parsed = CoupleSchema.safeParse({
      maleId: values.maleId?.trim() || '',
      femelleId: values.femelleId?.trim() || '',
      dateDebut: values.dateDebut,
      cageId: values.cageId?.trim() || null,
      notes: (values.notes ?? '').trim(),
    })
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

    try {
      await creerCouple({
        maleId: parsed.data.maleId,
        femelleId: parsed.data.femelleId,
        dateDebut: new Date(`${parsed.data.dateDebut}T12:00:00`),
        cageId: parsed.data.cageId ?? null,
        notes: parsed.data.notes ?? '',
      })
      toast.success('Couple créé')
      navigate('/couples')
    } catch (e) {
      toast.error(e?.message || 'Enregistrement impossible')
    }
  }

  const loading = loadPigeons || loadCages || loadCouples

  if (loading) {
    return (
      <AppLoadingScreen variant="embedded" loadingContext="couples" message="Chargement du formulaire…" subtitle="Pigeons, cages et couples disponibles." />
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link
          to="/couples"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-100"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Retour aux couples
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Nouveau couple</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Un mâle et une femelle <strong>actifs</strong>, non déjà engagés dans un couple actif. Tu peux optionnellement
          attribuer une <strong>cage libre</strong> tout de suite.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className={dmFormShellCompact}>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="maleId" className={dmLabelSm}>
              Mâle
            </label>
            <select id="maleId" className={fieldClass(errors.maleId)} {...register('maleId')}>
              <option value="">— Choisir un mâle —</option>
              {malesChoix.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.matricule} — {p.nom}
                </option>
              ))}
            </select>
            {errors.maleId ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.maleId.message}
              </p>
            ) : null}
            {malesChoix.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Aucun mâle actif disponible pour un nouveau couple.</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="femelleId" className={dmLabelSm}>
              Femelle
            </label>
            <select id="femelleId" className={fieldClass(errors.femelleId)} {...register('femelleId')}>
              <option value="">— Choisir une femelle —</option>
              {femellesChoix.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.matricule} — {p.nom}
                </option>
              ))}
            </select>
            {errors.femelleId ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.femelleId.message}
              </p>
            ) : null}
            {femellesChoix.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Aucune femelle active disponible pour un nouveau couple.</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="dateDebut" className={dmLabelSm}>
              Date de début
            </label>
            <input
              id="dateDebut"
              type="date"
              className={fieldClass(errors.dateDebut)}
              {...register('dateDebut')}
            />
            {errors.dateDebut ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.dateDebut.message}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="cageId" className={dmLabelSm}>
              Cage (optionnel)
            </label>
            <select id="cageId" className={fieldClass(errors.cageId)} {...register('cageId')}>
              <option value="">— Aucune —</option>
              {cagesLibres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.voliereCode ?? 'A'} · {c.numero} — {c.nom}
                </option>
              ))}
            </select>
            {errors.cageId ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.cageId.message}
              </p>
            ) : null}
            {cagesLibres.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Aucune cage libre : tu pourras affecter le couple depuis la visualisation.</p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="notes" className={dmLabelSm}>
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className={fieldClass(errors.notes)}
              placeholder="Remarques sur l’accouplement…"
              {...register('notes')}
            />
            {errors.notes ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.notes.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          <Link
            to="/couples"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || malesChoix.length === 0 || femellesChoix.length === 0}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Enregistrement…' : 'Créer le couple'}
          </button>
        </div>
      </form>
    </div>
  )
}
