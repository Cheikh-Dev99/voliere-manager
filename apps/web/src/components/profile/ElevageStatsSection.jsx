import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bird,
  Egg,
  Heart,
  History,
  LayoutGrid,
  MapPinned,
  Unlock,
  Users,
} from 'lucide-react'
import { usePigeons } from '@shared/hooks/usePigeons'
import { useCouples } from '@shared/hooks/useCouples'
import { useReproductions } from '@shared/hooks/useReproductions'
import { useSorties } from '@shared/hooks/useSorties'
import { mergeProfileVoliereCodesWithCages } from '@shared/utils/voliereCodesMerge'

const TONE = {
  slate: {
    ring:
      'border-slate-100 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800/90 dark:text-slate-100',
    icon: 'text-slate-600 dark:text-slate-300',
    hover: 'hover:border-slate-300 hover:bg-slate-100/90 dark:hover:border-slate-500 dark:hover:bg-slate-700/90',
  },
  teal: {
    ring:
      'border-teal-100 bg-teal-50/80 text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-100',
    icon: 'text-teal-600 dark:text-teal-300',
    hover: 'hover:border-teal-200 hover:bg-teal-50 dark:hover:border-teal-600 dark:hover:bg-teal-900/60',
  },
  rose: {
    ring:
      'border-rose-100 bg-rose-50/90 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100',
    icon: 'text-rose-600 dark:text-rose-300',
    hover: 'hover:border-rose-200 hover:bg-rose-50 dark:hover:border-rose-700 dark:hover:bg-rose-900/50',
  },
  violet: {
    ring:
      'border-violet-100 bg-violet-50/90 text-violet-950 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100',
    icon: 'text-violet-600 dark:text-violet-300',
    hover: 'hover:border-violet-200 hover:bg-violet-100/80 dark:hover:border-violet-700 dark:hover:bg-violet-900/50',
  },
  amber: {
    ring:
      'border-amber-100 bg-amber-50/90 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100',
    icon: 'text-amber-700 dark:text-amber-300',
    hover: 'hover:border-amber-200 hover:bg-amber-50 dark:hover:border-amber-700 dark:hover:bg-amber-900/45',
  },
  emerald: {
    ring:
      'border-emerald-100 bg-emerald-50/90 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
    icon: 'text-emerald-600 dark:text-emerald-300',
    hover: 'hover:border-emerald-200 hover:bg-emerald-50 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/50',
  },
  indigo: {
    ring:
      'border-indigo-100 bg-indigo-50/90 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-100',
    icon: 'text-indigo-600 dark:text-indigo-300',
    hover: 'hover:border-indigo-200 hover:bg-indigo-50 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/50',
  },
}

function StatTile({ icon: Icon, label, value, tone, to, loading, onNavigate }) {
  const cfg = TONE[tone] ?? TONE.slate
  const base = `flex min-h-[4.25rem] flex-col rounded-xl border px-2.5 py-2 transition-colors ${cfg.ring} ${
    to && !loading ? `${cfg.hover} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/45` : ''
  }`

  const inner = (
    <>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        <Icon className={`size-3.5 shrink-0 ${cfg.icon}`} aria-hidden />
        <span className="min-w-0 leading-tight">{label}</span>
      </div>
      <p className="mt-1 tabular-nums text-xl font-bold leading-none">{loading ? '…' : value}</p>
    </>
  )

  if (to && !loading) {
    return (
      <Link
        to={to}
        onClick={onNavigate}
        className={base}
        aria-label={`Ouvrir : ${label}`}
        title={`Voir ${label.toLowerCase()}`}
      >
        {inner}
      </Link>
    )
  }

  return (
    <div className={base} aria-busy={loading}>
      {inner}
    </div>
  )
}

/** Grille de statistiques élevage : cartes cliquables vers les écrans concernés. */
export function ElevageStatsSection({
  cages,
  cagesLoading,
  profile,
  variant = 'page',
  onNavigate,
  /** Si défini (ex. 4 dans le menu header), n’affiche que les N premières cartes. */
  maxTiles,
}) {
  const { pigeons, loading: lp, males, femelles } = usePigeons(false)
  const { couples, loading: lco } = useCouples(true)
  const { reproductions, loading: lr } = useReproductions()
  const { sorties, loading: ls } = useSorties()

  const couplesActifs = couples.length
  const nbVolieres = useMemo(
    () => mergeProfileVoliereCodesWithCages(profile?.voliereCodes, cages).length,
    [profile?.voliereCodes, cages],
  )
  const cagesLibres = useMemo(() => cages.filter((c) => c.statut === 'LIBRE').length, [cages])

  const statsLoading = lp || lco || lr || ls || cagesLoading

  const gridCls =
    variant === 'menu'
      ? 'grid grid-cols-2 gap-2'
      : 'grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'

  const tiles = [
    <StatTile
      key="pigeons"
      icon={Bird}
      label="Pigeons"
      value={String(pigeons.length)}
      tone="slate"
      to="/pigeons"
      loading={statsLoading}
      onNavigate={onNavigate}
    />,
    <StatTile
      key="cages"
      icon={LayoutGrid}
      label="Cages"
      value={String(cages.length)}
      tone="slate"
      to="/cages"
      loading={statsLoading}
      onNavigate={onNavigate}
    />,
    <StatTile
      key="volieres"
      icon={MapPinned}
      label="Volières"
      value={String(nbVolieres)}
      tone="teal"
      to="/profil#mes-volieres"
      loading={statsLoading}
      onNavigate={onNavigate}
    />,
    <StatTile
      key="couples"
      icon={Heart}
      label="Couples actifs"
      value={String(couplesActifs)}
      tone="rose"
      to="/couples"
      loading={statsLoading}
      onNavigate={onNavigate}
    />,
    <StatTile
      key="repro"
      icon={Egg}
      label="Reproductions"
      value={String(reproductions.length)}
      tone="violet"
      to="/reproductions"
      loading={statsLoading}
      onNavigate={onNavigate}
    />,
    <StatTile
      key="sorties"
      icon={History}
      label="Sorties"
      value={String(sorties.length)}
      tone="amber"
      to="/sorties"
      loading={statsLoading}
      onNavigate={onNavigate}
    />,
    <StatTile
      key="libres"
      icon={Unlock}
      label="Cages libres"
      value={String(cagesLibres)}
      tone="emerald"
      to="/cages"
      loading={statsLoading}
      onNavigate={onNavigate}
    />,
    <StatTile
      key="sexes"
      icon={Users}
      label="Mâles / femelles"
      value={`${males.length} / ${femelles.length}`}
      tone="indigo"
      to="/pigeons"
      loading={statsLoading}
      onNavigate={onNavigate}
    />,
  ]

  const visible =
    typeof maxTiles === 'number' && maxTiles > 0 ? tiles.slice(0, Math.min(maxTiles, tiles.length)) : tiles

  return <div className={gridCls}>{visible}</div>
}
