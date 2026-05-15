import { Link } from 'react-router-dom'
import { GitBranch, HelpCircle } from 'lucide-react'
import { buildAncestorRows, generationLabel } from '@shared/utils/genealogyTree'
import { getPigeonDisplayPhotoSrc } from '../../utils/localPigeonPhoto'
import { PigeonGenealogyNote } from './PigeonGenealogyNote'

const STATUT_DOT = {
  ACTIF: 'bg-emerald-500',
  VENDU: 'bg-slate-400',
  MORT: 'bg-zinc-500',
  PERDU: 'bg-amber-500',
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
        className={`flex min-w-[7.5rem] max-w-[11rem] flex-col rounded-xl border border-dashed border-slate-200 bg-slate-50/90 px-2.5 py-2 text-center dark:border-slate-600 dark:bg-slate-800/80 ${
          emphasis ? 'ring-2 ring-teal-400/40 dark:ring-teal-600/50' : ''
        }`}
      >
        <HelpCircle className="mx-auto size-5 text-slate-400 dark:text-slate-500" aria-hidden />
        <p className="mt-1 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">Réf. absente</p>
        <p className="truncate text-[10px] text-slate-400 dark:text-slate-500" title={pigeonId}>
          {pigeonId.slice(0, 8)}…
        </p>
      </div>
    )
  }

  return (
    <Link
      to={`/pigeons/${p.id}`}
      state={linkState}
      className={`group flex min-w-[7.5rem] max-w-[11rem] flex-col rounded-xl border bg-white px-2.5 py-2 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-teal-500 ${
        emphasis
          ? 'border-teal-300 ring-2 ring-teal-400/35 ring-offset-1 ring-offset-white dark:border-teal-500 dark:ring-teal-700/50 dark:ring-offset-slate-900'
          : 'border-slate-200/90 hover:ring-1 hover:ring-teal-200/60 dark:border-slate-600 dark:hover:ring-teal-700/40'
      }`}
    >
      <div className="flex items-start gap-2">
        {photoSrc ? (
          <img src={photoSrc} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[9px] text-slate-400 dark:bg-slate-700 dark:text-slate-500">
            —
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1">
            <span className={`size-1.5 shrink-0 rounded-full ${dot}`} title={p.statut} aria-hidden />
            <span
              className={`truncate text-[11px] font-semibold ${
                p.sexe === 'MALE' ? 'text-sky-800 dark:text-sky-300' : 'text-pink-800 dark:text-pink-300'
              }`}
            >
              {p.sexe === 'MALE' ? '♂' : '♀'} {p.matricule}
            </span>
          </p>
          <p className="truncate text-[10px] leading-tight text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-100">{p.nom}</p>
          {p.deletedAt ? (
            <p className="mt-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-300">Retiré de l’effectif</p>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function ConnectorDown() {
  return (
    <div className="flex justify-center py-0.5" aria-hidden>
      <div className="h-4 w-px bg-gradient-to-b from-slate-300 to-slate-200/80 dark:from-slate-600 dark:to-slate-700/80" />
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
    return <p className="text-center text-sm text-slate-500 dark:text-slate-400">Aucune donnée.</p>
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
                isSubjectRow
                  ? 'bg-gradient-to-b from-teal-50/80 to-white ring-1 ring-teal-200/50 dark:from-teal-950/40 dark:to-slate-900 dark:ring-teal-800/40'
                  : 'bg-slate-50/60 dark:bg-slate-800/50'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSubjectRow ? 'text-teal-800 dark:text-teal-200' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {label}
                </span>
                {!isSubjectRow ? (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
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
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center dark:border-slate-600 dark:bg-slate-800/60">
        <GitBranch className="mx-auto size-8 text-slate-300 dark:text-slate-500" aria-hidden />
        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">Généalogie indisponible</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Affecte un pigeon ou un couple pour voir l’arbre ascendant.</p>
      </div>
    )
  }

  const hasAnyParent = (p) => Boolean(p?.pereId || p?.mereId)

  if (hasSingle) {
    const hasTree = hasAnyParent(pigeon)
    return (
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          Lignée ascendante (jusqu’à <strong>grands-parents</strong> lorsque les fiches sont renseignées). Cliquez une
          fiche pour ouvrir le détail pigeon.
        </p>
        <PigeonGenealogyNote label={`Note · ${pigeon.matricule}`} notes={pigeon.notes} />
        {!hasTree ? (
          <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
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
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        Deux lignées côte à côte : chaque pigeon du couple a son propre ascendant. Les cartes mènent à la fiche
        détail.
      </p>
      <div className="grid gap-4 border-t border-slate-100 pt-3 dark:border-slate-700 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
            <span className="size-1.5 rounded-full bg-sky-500" aria-hidden />
            Mâle — {male.matricule}
          </p>
          <PigeonGenealogyNote label={`Note · ${male.matricule}`} notes={male.notes} accent="male" />
          {!mTree ? (
            <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">Parents non renseignés.</p>
          ) : null}
          <GenealogyForRoot
            rootId={male.id}
            pigeonById={pigeonById}
            maxGen={2}
            pigeonDetailLinkState={pigeonDetailLinkState}
          />
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-pink-800 dark:text-pink-300">
            <span className="size-1.5 rounded-full bg-pink-500" aria-hidden />
            Femelle — {femelle.matricule}
          </p>
          <PigeonGenealogyNote label={`Note · ${femelle.matricule}`} notes={femelle.notes} accent="female" />
          {!fTree ? (
            <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">Parents non renseignés.</p>
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
