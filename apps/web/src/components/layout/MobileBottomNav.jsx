import { NavLink } from 'react-router-dom'
import {
  Bird,
  ClipboardList,
  Egg,
  Heart,
  LayoutGrid,
  LayoutTemplate,
} from 'lucide-react'

const itemBase =
  'flex min-h-[52px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[10px] font-semibold leading-tight tracking-tight'

function MobileNavLink({ to, end, label, Icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${itemBase} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
          isActive ? 'text-teal-700' : 'text-slate-500 active:bg-slate-100/80'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={`size-[22px] shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-500'}`}
            strokeWidth={isActive ? 2.35 : 2}
            aria-hidden
          />
          <span className="max-w-[4.25rem] truncate text-center">{label}</span>
        </>
      )}
    </NavLink>
  )
}

/**
 * Navigation type « onglets » (mobile), alignée sur l’app Expo : libellés courts + icônes.
 * Masquée à partir du breakpoint `md` (nav dans le header).
 */
export function MobileBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200/95 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1 shadow-[0_-6px_24px_rgba(15,23,42,0.07)] backdrop-blur-md supports-[backdrop-filter]:bg-white/90 md:hidden"
      aria-label="Navigation principale (mobile)"
    >
      <MobileNavLink to="/" end label="Volière" Icon={LayoutTemplate} />
      <MobileNavLink to="/cages" label="Cages" Icon={LayoutGrid} />
      <MobileNavLink to="/pigeons" label="Pigeons" Icon={Bird} />
      <MobileNavLink to="/couples" label="Couples" Icon={Heart} />
      <MobileNavLink to="/reproductions" label="Repro." Icon={Egg} />
      <MobileNavLink to="/sorties" label="Sorties" Icon={ClipboardList} />
    </nav>
  )
}
