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
    ring: 'border-slate-100 bg-slate-50 text-slate-900',
    icon: 'text-slate-600',
    hover: 'hover:border-slate-300 hover:bg-slate-100/90',
  },
  teal: {
    ring: 'border-teal-100 bg-teal-50/80 text-teal-900',
    icon: 'text-teal-600',
    hover: 'hover:border-teal-200 hover:bg-teal-50',
  },
  rose: {
    ring: 'border-rose-100 bg-rose-50/90 text-rose-950',
    icon: 'text-rose-600',
    hover: 'hover:border-rose-200 hover:bg-rose-50',
  },
  violet: {
    ring: 'border-violet-100 bg-violet-50/90 text-violet-950',
    icon: 'text-violet-600',
    hover: 'hover:border-violet-200 hover:bg-violet-100/80',
  },
  amber: {
    ring: 'border-amber-100 bg-amber-50/90 text-amber-950',
    icon: 'text-amber-700',
    hover: 'hover:border-amber-200 hover:bg-amber-50',
  },
  emerald: {
    ring: 'border-emerald-100 bg-emerald-50/90 text-emerald-950',
    icon: 'text-emerald-600',
    hover: 'hover:border-emerald-200 hover:bg-emerald-50',
  },
  indigo: {
    ring: 'border-indigo-100 bg-indigo-50/90 text-indigo-950',
    icon: 'text-indigo-600',
    hover: 'hover:border-indigo-200 hover:bg-indigo-50',
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
