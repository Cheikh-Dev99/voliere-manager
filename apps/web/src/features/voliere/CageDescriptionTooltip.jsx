import { CircleAlert } from 'lucide-react'

/**
 * Petit pictogramme (point d’alerte) : au survol ou au focus, affiche la description de la cage.
 * Les événements sont stoppés pour ne pas déclencher la sélection de la cage au clic.
 *
 * @param {'below' | 'above'} [tooltipPlacement='below'] — `above` : bulle au-dessus du picto (ex. picto en bas de carte).
 */
export function CageDescriptionTooltip({ description, align = 'left', tooltipPlacement = 'below' }) {
  const text = (description ?? '').trim()
  if (!text) return null

  const tooltipPosition =
    tooltipPlacement === 'above'
      ? align === 'right'
        ? 'bottom-full right-0 left-auto mb-1'
        : 'bottom-full left-0 mb-1'
      : align === 'right'
        ? 'top-full right-0 left-auto mt-1'
        : 'top-full left-0 mt-1'

  return (
    <span
      className="relative inline-flex shrink-0"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        tabIndex={0}
        className="group/desc rounded p-0.5 text-amber-600/90 outline-none ring-offset-1 hover:text-amber-700 focus-visible:ring-2 focus-visible:ring-teal-500"
        aria-label="Description de la cage"
      >
        <CircleAlert className="size-3.5" strokeWidth={2.2} aria-hidden />
        <span
          role="tooltip"
          className={`pointer-events-none invisible absolute z-50 max-h-36 w-max min-w-[8rem] max-w-[min(17rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-slate-200 bg-white p-2 text-left text-[11px] font-normal leading-snug text-slate-700 shadow-lg opacity-0 transition-opacity duration-150 group-hover/desc:visible group-hover/desc:opacity-100 group-focus-within/desc:visible group-focus-within/desc:opacity-100 ${tooltipPosition}`}
        >
          {text}
        </span>
      </button>
    </span>
  )
}
