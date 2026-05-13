import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Info, Loader2, Plus, Trash2 } from 'lucide-react'
import { updateUserProfile } from '@shared/services/usersProfileService'
import {
  mergeProfileVoliereCodesWithCages,
  normalizeVoliereCodeInput,
  isVoliereCodeUsedByCages,
  VOLIERE_CODE_MAX_LEN,
} from '@shared/utils/voliereCodesMerge'

/** Ajoute un code normalisé à la liste si valide et pas déjà présent. */
function appendCodeIfNew(pendingRaw, currentDraft) {
  const n = normalizeVoliereCodeInput(pendingRaw)
  if (!n) return { next: currentDraft, added: false, reason: 'empty' }
  if (currentDraft.some((c) => c === n)) return { next: currentDraft, added: false, reason: 'duplicate' }
  const next = [...currentDraft, n].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
  return { next, added: true, reason: null }
}

/**
 * Déclaration des volières (profil) : nom court de chaque volière, avec garde-fous si des cages existent.
 */
export function VoliereCodesPanel({ uid, profile, cages }) {
  const merged = useMemo(
    () => mergeProfileVoliereCodesWithCages(profile?.voliereCodes, cages),
    [profile?.voliereCodes, cages],
  )

  const [draft, setDraft] = useState(merged)
  const [newCode, setNewCode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(merged)
  }, [merged])

  const addCode = useCallback(() => {
    const { next, added, reason } = appendCodeIfNew(newCode, draft)
    if (!added) {
      if (reason === 'duplicate') toast.error('Cette volière est déjà dans la liste.')
      else if ((newCode ?? '').trim())
        toast.error(`Indique un nom court valide pour la volière (1 à ${VOLIERE_CODE_MAX_LEN} caractères).`)
      return
    }
    setDraft(next)
    setNewCode('')
  }, [draft, newCode])

  const removeCode = useCallback(
    (code) => {
      if (isVoliereCodeUsedByCages(code, cages)) {
        toast.error('Impossible de retirer cette volière : des cages y sont encore rattachées.')
        return
      }
      setDraft((d) => d.filter((x) => x !== code))
    },
    [cages],
  )

  const handleSave = useCallback(async () => {
    const pendingLabel = normalizeVoliereCodeInput(newCode)
    const { next: draftWithPending, added } = appendCodeIfNew(newCode, draft)
    const final = mergeProfileVoliereCodesWithCages(draftWithPending, cages)
    setSaving(true)
    try {
      await updateUserProfile(uid, { voliereCodes: final })
      setDraft(final)
      setNewCode('')
      toast.success(
        added && pendingLabel
          ? `La volière « ${pendingLabel} » est enregistrée — choisis-la dans le menu déroulant de la visualisation.`
          : 'Volières enregistrées.',
      )
    } catch (e) {
      toast.error(e?.message ?? 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }, [uid, draft, cages, newCode])

  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50/40 px-3 py-3">
      <div className="flex gap-2 text-xs text-teal-950">
        <Info className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden />
        <p className="leading-relaxed">
          Chaque <strong>volière</strong> (bâtiment ou zone) est identifiée dans l’app par un{' '}
          <strong>nom court</strong> (ex. <strong>B</strong>, <strong>Nord</strong>). Tu peux les déclarer ici avant de
          créer des cages ; ils apparaissent dans la visualisation et les formulaires, avec les volières déjà présentes
          sur tes cages.
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2" aria-label="Volières déclarées (nom court)">
        {draft.map((code) => {
          const locked = isVoliereCodeUsedByCages(code, cages)
          return (
            <li
              key={code}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-800 shadow-sm"
            >
              <span>{code}</span>
              <button
                type="button"
                disabled={locked}
                title={locked ? 'Des cages sont encore dans cette volière' : `Retirer la volière « ${code} »`}
                onClick={() => removeCode(code)}
                className="rounded p-0.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="new-voliere-code" className="mb-1 block text-xs font-medium text-slate-600">
            Nom court de la nouvelle volière
          </label>
          <input
            id="new-voliere-code"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addCode()
              }
            }}
            maxLength={VOLIERE_CODE_MAX_LEN}
            placeholder="Ex. B, Nord…"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25"
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          onClick={addCode}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-teal-600 bg-white px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
        >
          <Plus className="size-4" aria-hidden />
          Ajouter
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-600">
        Tu peux saisir le <strong className="text-slate-800">nom court</strong> puis cliquer{' '}
        <strong className="text-slate-800">Enregistrer les volières</strong> : le champ est pris en compte tout seul.
        Sinon, <strong className="text-slate-800">+ Ajouter</strong> ou la touche{' '}
        <strong className="text-slate-800">Entrée</strong> affiche d’abord la pastille dans la liste.
      </p>

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {saving ? 'Enregistrement…' : 'Enregistrer les volières'}
      </button>
    </div>
  )
}
