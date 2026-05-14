import { CageCell } from './CageCell'

export function VoliereGrid({
  cages,
  selectedId,
  onSelect,
  pigeonById,
  coupleById,
  maleByCouple,
  femelleByCouple,
  dragOverCageId,
  onDragStartSolo,
  onDragOverCage,
  onDragLeaveCage,
  onDropOnCage,
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-3">
      {cages.map((cage) => {
        const pigeon = cage.pigeonId ? pigeonById.get(cage.pigeonId) : null
        const couple = cage.coupleId ? coupleById.get(cage.coupleId) : null
        const male = couple ? maleByCouple.get(couple.id) : null
        const femelle = couple ? femelleByCouple.get(couple.id) : null

        let titleHover = `Cage ${cage.numero} — ${cage.statut === 'LIBRE' ? 'libre' : ''}`
        if (cage.statut === 'OCCUPE_PIGEON' && pigeon) {
          titleHover = `${pigeon.matricule} — ${pigeon.nom}`
        }
        if (cage.statut === 'OCCUPE_COUPLE' && male && femelle) {
          titleHover = `${male.matricule} (${male.nom}) · ${femelle.matricule} (${femelle.nom})`
        }

        return (
          <CageCell
            key={cage.id}
            cage={cage}
            selected={selectedId === cage.id}
            onSelect={() => onSelect(cage.id)}
            titleHover={titleHover}
            pigeon={pigeon}
            male={male}
            femelle={femelle}
            isDropTarget={dragOverCageId === cage.id}
            onDragStartSolo={onDragStartSolo}
            onDragOverCard={(e) => onDragOverCage?.(cage, e)}
            onDragLeaveCard={(e) => onDragLeaveCage?.(cage, e)}
            onDropCard={(e) => onDropOnCage?.(cage, e)}
          />
        )
      })}
    </div>
  )
}
