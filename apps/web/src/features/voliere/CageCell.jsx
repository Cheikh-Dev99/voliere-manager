import { Bird, GripVertical } from 'lucide-react'
import { CageDescriptionTooltip } from './CageDescriptionTooltip'

const statutStyles = {
  LIBRE: {
    card: 'border-emerald-200 bg-emerald-50/80 hover:border-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Libre',
  },
  OCCUPE_PIGEON: {
    card: 'border-rose-200 bg-rose-50/80 hover:border-rose-300',
    dot: 'bg-rose-500',
    label: '1 pigeon',
  },
  OCCUPE_COUPLE: {
    card: 'border-amber-200 bg-amber-50/80 hover:border-amber-300',
    dot: 'bg-amber-500',
    label: '2 pigeons',
  },
}

/**
 * Carte cage — grille volière (codes couleur cahier DTS).
 * Glisser-déposer : poignée sur cage « 1 pigeon » pour former un couple sur une autre cage occupée par un pigeon du sexe opposé.
 */
export function CageCell({
  cage,
  selected,
  onSelect,
  titleHover,
  pigeon,
  male,
  femelle,
  isDropTarget,
  onDragStartSolo,
  onDragOverCard,
  onDragLeaveCard,
  onDropCard,
}) {
  const st = statutStyles[cage.statut] || statutStyles.LIBRE
  const birds =
    cage.statut === 'OCCUPE_COUPLE' ? (
      <div className="flex justify-center gap-0.5 text-amber-700" aria-hidden>
        <Bird className="size-5" />
        <Bird className="size-5" />
      </div>
    ) : cage.statut === 'OCCUPE_PIGEON' ? (
      <div className="flex justify-center text-rose-700" aria-hidden>
        <Bird className="size-5" />
      </div>
    ) : (
      <div className="h-5" />
    )

  const showDragHandle = Boolean(onDragStartSolo && cage.statut === 'OCCUPE_PIGEON' && cage.pigeonId)
  const soloPigeonId = cage.statut === 'OCCUPE_PIGEON' ? cage.pigeonId : null
  const hasDescription = Boolean((cage.description ?? '').trim())

  return (
    <div
      className={`flex min-h-[7.25rem] rounded-xl border-2 shadow-sm transition ${
        st.card
      } ${selected ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-slate-50' : ''} ${
        isDropTarget ? 'ring-2 ring-teal-500 ring-offset-2 ring-offset-slate-50' : ''
      }`}
      onDragOver={onDragOverCard}
      onDragLeave={onDragLeaveCard}
      onDrop={onDropCard}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        }}
        title={titleHover}
        className={`relative min-w-0 flex-1 cursor-pointer rounded-l-xl p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500/60 ${
          hasDescription ? 'pb-8' : ''
        }`}
      >
        {hasDescription ? (
          <div className="pointer-events-auto absolute bottom-2 left-2 z-10">
            <CageDescriptionTooltip description={cage.description} tooltipPlacement="above" />
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-slate-900">{cage.numero}</span>
          <span className={`mt-0.5 size-2.5 shrink-0 rounded-full ${st.dot}`} title={st.label} />
        </div>
        <div className="mt-2 flex min-h-[28px] items-center justify-center">{birds}</div>
        <p className="mt-1 text-center text-xs font-medium text-slate-600">{st.label}</p>
        {cage.statut === 'OCCUPE_PIGEON' && soloPigeonId ? (
          <div className="mt-0.5 min-h-0 text-center">
            <p className="truncate text-[11px] font-medium text-slate-700">
              {pigeon?.matricule ?? '—'}
            </p>
            <p className="truncate text-[10px] leading-tight text-slate-500">{pigeon?.nom ?? ''}</p>
          </div>
        ) : null}
        {cage.statut === 'OCCUPE_COUPLE' && male && femelle ? (
          <div className="mt-0.5 min-h-0 text-center">
            <p className="truncate text-[11px] font-medium text-slate-700">
              {male.matricule} · {femelle.matricule}
            </p>
            <p className="truncate text-[10px] leading-tight text-slate-500">
              {male.nom} / {femelle.nom}
            </p>
          </div>
        ) : null}
      </div>
      {showDragHandle ? (
        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            onDragStartSolo(soloPigeonId, e)
          }}
          className="flex w-9 shrink-0 cursor-grab flex-col items-center justify-center rounded-r-lg border-l border-rose-200/80 bg-rose-100/50 text-rose-800 hover:bg-rose-100 active:cursor-grabbing"
          title={`Glisser ${pigeon?.matricule ?? 'le pigeon'} sur une autre cage « 1 pigeon » du sexe opposé pour créer un couple`}
          aria-label={`Glisser ${pigeon?.matricule ?? 'le pigeon'} pour former un couple`}
        >
          <GripVertical className="size-5 opacity-80" aria-hidden />
        </div>
      ) : null}
    </div>
  )
}
