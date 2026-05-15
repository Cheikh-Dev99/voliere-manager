import { useCallback, useRef } from 'react'
import { FileText, X } from 'lucide-react'

import { dmDialogSurface } from '../../theme/voliereDarkUi'
import { vmPressable, vmTransitionInteractive } from '../../theme/voliereMotionUi'

/**
 * Note pigeon dans la vue généalogie cage — aperçu compact, texte complet en modale.
 */
export function PigeonGenealogyNote({ label, notes, accent = 'neutral' }) {
  const text = (notes ?? '').trim()
  const dialogRef = useRef(null)

  const open = useCallback(() => {
    const el = dialogRef.current
    if (!el) return
    if (typeof el.showModal === 'function') el.showModal()
  }, [])

  const close = useCallback(() => {
    dialogRef.current?.close()
  }, [])

  if (!text) return null

  const preview = text.length > 88 ? `${text.slice(0, 88)}…` : text
  const accentBorder =
    accent === 'male'
      ? 'border-sky-200/80 bg-sky-50/50 hover:border-sky-300 dark:border-sky-800/60 dark:bg-sky-950/30'
      : accent === 'female'
        ? 'border-pink-200/80 bg-pink-50/50 hover:border-pink-300 dark:border-pink-900/50 dark:bg-pink-950/25'
        : 'border-slate-200/90 bg-slate-50/80 hover:border-teal-200 dark:border-slate-600 dark:bg-slate-800/70'

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`mb-2 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left ${accentBorder} ${vmPressable} ${vmTransitionInteractive}`}
        aria-haspopup="dialog"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/80 dark:bg-slate-900/80">
          <FileText className="size-4 text-teal-700 dark:text-teal-300" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label ?? 'Note pigeon'}
          </span>
          <span className="mt-0.5 block truncate text-xs leading-snug text-slate-600 dark:text-slate-300">{preview}</span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-teal-800 dark:text-teal-300">Lire</span>
      </button>

      <dialog
        ref={dialogRef}
        className={`w-[min(100%,28rem)] border-0 p-0 ${dmDialogSurface}`}
        onClose={close}
        aria-labelledby="pigeon-genealogy-note-title"
      >
        <div className="flex max-h-[min(70vh,32rem)] flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
            <div className="min-w-0">
              <p
                id="pigeon-genealogy-note-title"
                className="text-base font-bold text-slate-900 dark:text-slate-50"
              >
                {label ?? 'Note pigeon'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Fiche pigeon · visible aussi sur la fiche détail
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className={`rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 ${vmPressable}`}
              aria-label="Fermer"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pt-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{text}</p>
          </div>
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-700">
            <button
              type="button"
              onClick={close}
              className={`rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 ${vmPressable}`}
            >
              Fermer
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
