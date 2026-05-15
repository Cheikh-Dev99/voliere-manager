import { NavLink } from 'react-router-dom'
import {
  Bird,
  ClipboardList,
  Egg,
  Heart,
  LayoutGrid,
  LayoutTemplate,
} from 'lucide-react'

import { vmChromeBottomNav, vmPressable, vmTransitionInteractive } from '../../theme/voliereMotionUi'

const itemBase = `relative flex min-h-[52px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[10px] font-semibold leading-tight tracking-tight ${vmPressable}`

function MobileNavLink({ to, end, label, Icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${itemBase} ${vmTransitionInteractive} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
          isActive
            ? 'scale-[1.03] rounded-xl bg-teal-50/95 text-teal-700 shadow-sm shadow-teal-900/10 dark:bg-teal-950/55 dark:text-teal-300 dark:shadow-black/30'
            : 'text-slate-500 active:bg-slate-100/80 dark:text-slate-400 dark:active:bg-slate-800/80'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={`size-[22px] shrink-0 ${isActive ? 'vm-nav-icon-active text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}`}
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
      className={`fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200/95 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 dark:border-slate-700/95 dark:bg-slate-900/95 dark:supports-[backdrop-filter]:bg-slate-900/90 md:hidden ${vmChromeBottomNav}`}
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
