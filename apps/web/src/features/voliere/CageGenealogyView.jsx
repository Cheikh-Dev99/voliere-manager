import { Link } from 'react-router-dom'
import { GitBranch, HelpCircle } from 'lucide-react'
import { getPigeonDisplayPhotoSrc } from '../../utils/localPigeonPhoto'

const STATUT_DOT = {
  ACTIF: 'bg-emerald-500',
  VENDU: 'bg-slate-400',
  MORT: 'bg-zinc-500',
  PERDU: 'bg-amber-500',
}

/**
 * Construit les lignes du tableau ascendant : ancêtres les plus lointains en premier,
 * le sujet (profondeur 0) en dernier. `maxGen` = nombre de générations au-dessus du sujet (ex. 2 = parents + grands-parents).
 */
function buildAncestorRows(rootId, pigeonById, maxGen = 2) {
  const genById = new Map()
  const queue = [{ id: rootId, g: 0 }]
  const seen = new Set()

  while (queue.length) {
    const { id, g } = queue.shift()
    if (!id || g > maxGen) continue
    if (seen.has(id)) continue
    seen.add(id)
    genById.set(id, g)
    const p = pigeonById.get(id)
    if (!p) continue
    if (p.pereId) queue.push({ id: p.pereId, g: g + 1 })
    if (p.mereId) queue.push({ id: p.mereId, g: g + 1 })
  }

  const maxG = Math.max(0, ...genById.values())
  const rows = []
  for (let g = maxG; g >= 0; g -= 1) {
    const ids = [...genById.entries()]
      .filter(([, gv]) => gv === g)
      .map(([id]) => id)
    ids.sort((a, b) => {
      const pa = pigeonById.get(a)
      const pb = pigeonById.get(b)
      return (pa?.matricule ?? a).localeCompare(pb?.matricule ?? b, 'fr', { numeric: true })
    })
    rows.push(ids)
  }
  return rows
}

function generationLabel(depthFromSubject) {
  if (depthFromSubject === 0) return 'Sujet'
  if (depthFromSubject === 1) return 'Parents'
  if (depthFromSubject === 2) return 'Grands-parents'
  return `Ancêtres (+${depthFromSubject})`
}

const DEFAULT_PIGEON_DETAIL_LINK_STATE = { back: { path: '/', label: 'Visualisation' } }

function PigeonMiniCard({ pigeonId, pigeonById, emphasis, pigeonDetailLinkState }) {
  const p = pigeonById.get(pigeonId)
  const photoSrc = p ? getPigeonDisplayPhotoSrc(p) : null
  const dot = p ? STATUT_DOT[p.statut] ?? 'bg-slate-300' : 'bg-slate-300'
  const linkState = pigeonDetailLinkState ?? DEFAULT_PIGEON_DETAIL_LINK_STATE

  if (!p) {
    return (
      <div
        className={`flex min-w-[7.5rem] max-w-[11rem] flex-col rounded-xl border border-dashed border-slate-200 bg-slate-50/90 px-2.5 py-2 text-center ${
          emphasis ? 'ring-2 ring-teal-400/40' : ''
        }`}
      >
        <HelpCircle className="mx-auto size-5 text-slate-400" aria-hidden />
        <p className="mt-1 font-mono text-[10px] font-medium text-slate-500">Réf. absente</p>
        <p className="truncate text-[10px] text-slate-400" title={pigeonId}>
          {pigeonId.slice(0, 8)}…
        </p>
      </div>
    )
  }

  return (
    <Link
      to={`/pigeons/${p.id}`}
      state={linkState}
      className={`group flex min-w-[7.5rem] max-w-[11rem] flex-col rounded-xl border bg-white px-2.5 py-2 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
        emphasis
          ? 'border-teal-300 ring-2 ring-teal-400/35 ring-offset-1 ring-offset-white'
          : 'border-slate-200/90 hover:ring-1 hover:ring-teal-200/60'
      }`}
    >
      <div className="flex items-start gap-2">
        {photoSrc ? (
          <img src={photoSrc} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[9px] text-slate-400">
            —
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1">
            <span className={`size-1.5 shrink-0 rounded-full ${dot}`} title={p.statut} aria-hidden />
            <span
              className={`truncate text-[11px] font-semibold ${
                p.sexe === 'MALE' ? 'text-sky-800' : 'text-pink-800'
              }`}
            >
              {p.sexe === 'MALE' ? '♂' : '♀'} {p.matricule}
            </span>
          </p>
          <p className="truncate text-[10px] leading-tight text-slate-600 group-hover:text-slate-900">{p.nom}</p>
          {p.deletedAt ? (
            <p className="mt-0.5 text-[9px] font-medium text-amber-700">Retiré de l’effectif</p>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function ConnectorDown() {
  return (
    <div className="flex justify-center py-0.5" aria-hidden>
      <div className="h-4 w-px bg-gradient-to-b from-slate-300 to-slate-200/80" />
    </div>
  )
}

/**
 * Arbre ascendant compact, optimisé panneau latéral étroit (scroll horizontal si besoin).
 */
function GenealogyForRoot({ rootId, pigeonById, maxGen = 2, pigeonDetailLinkState }) {
  const rows = buildAncestorRows(rootId, pigeonById, maxGen)
  const maxDepth = rows.length - 1

  if (rows.length === 0) {
    return <p className="text-center text-sm text-slate-500">Aucune donnée.</p>
  }

  return (
    <div className="space-y-0">
      {rows.map((ids, rowIdx) => {
        const depthFromSubject = maxDepth - rowIdx
        const isSubjectRow = rowIdx === rows.length - 1
        const label = generationLabel(depthFromSubject)

        return (
          <div key={`row-${rowIdx}`}>
            {rowIdx > 0 ? <ConnectorDown /> : null}
            <div
              className={`rounded-xl px-2 py-3 ${
                isSubjectRow ? 'bg-gradient-to-b from-teal-50/80 to-white ring-1 ring-teal-200/50' : 'bg-slate-50/60'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSubjectRow ? 'text-teal-800' : 'text-slate-500'
                  }`}
                >
                  {label}
                </span>
                {!isSubjectRow ? (
                  <span className="text-[10px] text-slate-400">
                    {ids.length} pigeon{ids.length > 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-center">
                {ids.map((id) => (
                  <PigeonMiniCard
                    key={id}
                    pigeonId={id}
                    pigeonById={pigeonById}
                    emphasis={isSubjectRow}
                    pigeonDetailLinkState={pigeonDetailLinkState}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Vue généalogie pour le panneau cage — un ou deux sujets (couple).
 */
/** `pigeonDetailLinkState` : état passé aux liens fiche pigeon depuis les mini-cartes (défaut : retour visualisation). */
export function CageGenealogyView({ mode, pigeon, male, femelle, pigeonById, pigeonDetailLinkState }) {
  const hasSingle = mode === 'solo' && pigeon
  const hasCouple = mode === 'couple' && male && femelle

  if (!hasSingle && !hasCouple) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center">
        <GitBranch className="mx-auto size-8 text-slate-300" aria-hidden />
        <p className="mt-2 text-sm font-medium text-slate-600">Généalogie indisponible</p>
        <p className="mt-1 text-xs text-slate-500">Affecte un pigeon ou un couple pour voir l’arbre ascendant.</p>
      </div>
    )
  }

  const hasAnyParent = (p) => Boolean(p?.pereId || p?.mereId)

  if (hasSingle) {
    const hasTree = hasAnyParent(pigeon)
    return (
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-slate-600">
          Lignée ascendante (jusqu’à <strong>grands-parents</strong> lorsque les fiches sont renseignées). Cliquez une
          fiche pour ouvrir le détail pigeon.
        </p>
        {!hasTree ? (
          <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
            Aucun père ni mère renseigné sur la fiche — complète la généalogie depuis{' '}
            <strong>Modifier la fiche</strong> pour enrichir l’arbre.
          </div>
        ) : null}
        <GenealogyForRoot
          rootId={pigeon.id}
          pigeonById={pigeonById}
          maxGen={2}
          pigeonDetailLinkState={pigeonDetailLinkState}
        />
      </div>
    )
  }

  const mTree = hasAnyParent(male)
  const fTree = hasAnyParent(femelle)

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-slate-600">
        Deux lignées côte à côte : chaque pigeon du couple a son propre ascendant. Les cartes mènent à la fiche
        détail.
      </p>
      <div className="grid gap-4 border-t border-slate-100 pt-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-800">
            <span className="size-1.5 rounded-full bg-sky-500" aria-hidden />
            Mâle — {male.matricule}
          </p>
          {!mTree ? (
            <p className="mb-2 text-[11px] text-slate-500">Parents non renseignés.</p>
          ) : null}
          <GenealogyForRoot
            rootId={male.id}
            pigeonById={pigeonById}
            maxGen={2}
            pigeonDetailLinkState={pigeonDetailLinkState}
          />
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-pink-800">
            <span className="size-1.5 rounded-full bg-pink-500" aria-hidden />
            Femelle — {femelle.matricule}
          </p>
          {!fTree ? (
            <p className="mb-2 text-[11px] text-slate-500">Parents non renseignés.</p>
          ) : null}
          <GenealogyForRoot
            rootId={femelle.id}
            pigeonById={pigeonById}
            maxGen={2}
            pigeonDetailLinkState={pigeonDetailLinkState}
          />
        </div>
      </div>
    </div>
  )
}
