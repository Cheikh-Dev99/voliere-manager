import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import { useCouples } from '@shared/hooks/useCouples'
import { usePigeons } from '@shared/hooks/usePigeons'
import { ReproductionSchema } from '@shared/validators/schemas'
import {
  assertParentsBirthBeforeReproductionDates,
  enregistrerReproduction,
} from '@shared/services/reproductionsService'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'

function fieldClass(err) {
  return `w-full rounded-lg border px-3 py-2 text-slate-900 outline-none focus:ring-2 ${
    err ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500/30'
  }`
}

function formatCoupleLabel(c, pigeonById) {
  const m = pigeonById.get(c.maleId)
  const f = pigeonById.get(c.femelleId)
  const left = m ? `${m.matricule}` : '?'
  const right = f ? `${f.matricule}` : '?'
  return `${left} + ${right}`
}

export function ReproductionFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const coupleIdFromUrl = searchParams.get('coupleId')?.trim() || ''

  const { couples, loading: loadCouples } = useCouples(true)
  const { pigeons, loading: loadPigeons } = usePigeons(false)

  const pigeonById = useMemo(() => {
    const m = new Map()
    for (const p of pigeons) m.set(p.id, p)
    return m
  }, [pigeons])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      coupleId: coupleIdFromUrl,
      datePonte: '',
      dateEclosion: '',
      nombreOeufs: 2,
      nombrePigeonneaux: 0,
      notes: '',
    },
  })

  const [urlCoupleApplied, setUrlCoupleApplied] = useState(false)

  useEffect(() => {
    if (urlCoupleApplied || !coupleIdFromUrl || loadCouples) return
    const ok = couples.some((c) => c.id === coupleIdFromUrl)
    if (ok) {
      setValue('coupleId', coupleIdFromUrl)
      setUrlCoupleApplied(true)
    }
  }, [coupleIdFromUrl, couples, loadCouples, setValue, urlCoupleApplied])

  const loading = loadCouples || loadPigeons

  async function onSubmit(values) {
    const parsed = ReproductionSchema.safeParse({
      ...values,
      nombreOeufs: Number(values.nombreOeufs),
      nombrePigeonneaux: Number(values.nombrePigeonneaux),
      dateEclosion: values.dateEclosion?.trim() ? values.dateEclosion : null,
    })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Données invalides')
      return
    }
    const coupleSel = couples.find((x) => x.id === parsed.data.coupleId)
    const male = coupleSel ? pigeonById.get(coupleSel.maleId) : null
    const femelle = coupleSel ? pigeonById.get(coupleSel.femelleId) : null
    if (!coupleSel || !male || !femelle) {
      toast.error('Couple ou pigeons introuvables pour la validation.')
      return
    }
    try {
      assertParentsBirthBeforeReproductionDates(
        male,
        femelle,
        new Date(`${parsed.data.datePonte}T12:00:00`),
        parsed.data.dateEclosion?.trim() ? new Date(`${parsed.data.dateEclosion.trim()}T12:00:00`) : null,
      )
    } catch (e) {
      toast.error(e?.message ?? 'Dates incohérentes avec les fiches parents')
      return
    }
    try {
      await enregistrerReproduction({
        coupleId: parsed.data.coupleId,
        datePonte: new Date(`${parsed.data.datePonte}T12:00:00`),
        dateEclosion: parsed.data.dateEclosion?.trim()
          ? new Date(`${parsed.data.dateEclosion.trim()}T12:00:00`)
          : null,
        nombreOeufs: parsed.data.nombreOeufs,
        nombrePigeonneaux: parsed.data.nombrePigeonneaux,
        notes: parsed.data.notes ?? '',
      })
      toast.success('Reproduction enregistrée')
      navigate('/reproductions')
    } catch (e) {
      toast.error(e?.message || 'Enregistrement impossible')
    }
  }

  const coupleId = watch('coupleId')

  if (loading) {
    return <AppLoadingScreen variant="embedded" loadingContext="reproduction" message="Chargement…" subtitle="Couples et pigeons." />
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        to="/reproductions"
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Liste des reproductions
      </Link>
      <h1 className="text-xl font-semibold text-slate-900">Nouvelle reproduction</h1>
      <p className="text-sm text-slate-600">
        Choisis un <strong>couple actif</strong>. Les deux pigeons doivent être <strong>actifs</strong> au moment de
        l’enregistrement.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="rep-couple" className="mb-1 block text-sm font-medium text-slate-700">
            Couple
          </label>
          <select
            id="rep-couple"
            {...register('coupleId')}
            className={fieldClass(errors.coupleId)}
            disabled={couples.length === 0}
          >
            <option value="">— Choisir un couple —</option>
            {couples.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCoupleLabel(c, pigeonById)}
              </option>
            ))}
          </select>
          {errors.coupleId ? <p className="mt-1 text-xs text-red-600">{errors.coupleId.message}</p> : null}
          {couples.length === 0 ? (
            <p className="mt-2 text-xs text-amber-800">
              Aucun couple actif.{' '}
              <Link to="/couples/nouveau" className="font-medium underline">
                Créer un couple
              </Link>
            </p>
          ) : null}
        </div>

        {coupleId ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {(() => {
              const c = couples.find((x) => x.id === coupleId)
              if (!c) return null
              const m = pigeonById.get(c.maleId)
              const f = pigeonById.get(c.femelleId)
              return (
                <p>
                  Mâle : {m ? `${m.matricule} — ${m.nom}` : '—'} · Femelle : {f ? `${f.matricule} — ${f.nom}` : '—'}
                </p>
              )
            })()}
          </div>
        ) : null}

        <div>
          <label htmlFor="rep-ponte" className="mb-1 block text-sm font-medium text-slate-700">
            Date de ponte
          </label>
          <input id="rep-ponte" type="date" {...register('datePonte')} className={fieldClass(errors.datePonte)} />
          {errors.datePonte ? <p className="mt-1 text-xs text-red-600">{errors.datePonte.message}</p> : null}
        </div>

        <div>
          <label htmlFor="rep-eclosion" className="mb-1 block text-sm font-medium text-slate-700">
            Date d’éclosion (optionnel)
          </label>
          <input id="rep-eclosion" type="date" {...register('dateEclosion')} className={fieldClass(errors.dateEclosion)} />
          {errors.dateEclosion ? (
            <p className="mt-1 text-xs text-red-600">{errors.dateEclosion.message}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rep-oeufs" className="mb-1 block text-sm font-medium text-slate-700">
              Nombre d’œufs
            </label>
            <input
              id="rep-oeufs"
              type="number"
              min={1}
              step={1}
              {...register('nombreOeufs', { valueAsNumber: true })}
              className={fieldClass(errors.nombreOeufs)}
            />
            {errors.nombreOeufs ? <p className="mt-1 text-xs text-red-600">{errors.nombreOeufs.message}</p> : null}
          </div>
          <div>
            <label htmlFor="rep-jeunes" className="mb-1 block text-sm font-medium text-slate-700">
              Pigeonneaux (nombre)
            </label>
            <input
              id="rep-jeunes"
              type="number"
              min={0}
              step={1}
              {...register('nombrePigeonneaux', { valueAsNumber: true })}
              className={fieldClass(errors.nombrePigeonneaux)}
            />
            {errors.nombrePigeonneaux ? (
              <p className="mt-1 text-xs text-red-600">{errors.nombrePigeonneaux.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="rep-notes" className="mb-1 block text-sm font-medium text-slate-700">
            Notes
          </label>
          <textarea id="rep-notes" rows={3} {...register('notes')} className={fieldClass(errors.notes)} />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || couples.length === 0}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <Link
            to="/reproductions"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
