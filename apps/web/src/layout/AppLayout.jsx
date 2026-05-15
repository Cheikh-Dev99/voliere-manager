import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bird,
  Heart,
  ClipboardList,
  LayoutGrid,
  Egg,
  LayoutTemplate,
} from 'lucide-react'
import { UserProfileMenu } from '../components/layout/UserProfileMenu'
import { ThemeHeaderToggle } from '../theme/ThemeHeaderToggle'
import { MobileBottomNav } from '../components/layout/MobileBottomNav'
import { SiteBackgroundDecor } from '../components/layout/SiteBackgroundDecor'
import logoUrl from '../assets/logo.png'

/** Liens nav web — taille intermédiaire (lisible sans occuper toute la largeur). */
const navInactive =
  'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-slate-800/90 dark:hover:text-slate-50 dark:focus-visible:ring-offset-slate-900'
const navActive =
  'bg-teal-100 text-teal-900 shadow-sm ring-1 ring-teal-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 dark:bg-teal-900/50 dark:text-teal-50 dark:ring-teal-600/40 dark:focus-visible:ring-offset-slate-900'

function navClassWithIcon({ isActive }) {
  return `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium leading-tight transition-colors ${isActive ? navActive : navInactive}`
}

/** Même règle que le mobile : filigrane sur les six écrans liste + fond uni ailleurs. */
const FILIGREE_PATHS = new Set(['/', '/cages', '/pigeons', '/couples', '/reproductions', '/sorties'])

export function AppLayout() {
  const { pathname } = useLocation()
  const showFiligree = FILIGREE_PATHS.has(pathname)

  return (
    <div className="app-root relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-teal-50/40 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:text-slate-100">
      {showFiligree ? <SiteBackgroundDecor /> : null}
      <header className="app-header-no-print relative sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-white/80 dark:border-slate-700/90 dark:bg-slate-900/95 dark:shadow-[0_1px_0_rgba(0,0,0,0.35)] dark:supports-[backdrop-filter]:bg-slate-900/85">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-2 py-2.5 sm:px-4 sm:py-3 md:justify-start md:gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center rounded-xl outline-none ring-offset-2 transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            aria-label="Volière Manager — accueil"
          >
            <img
              src={logoUrl}
              alt="Volière Manager"
              className="h-10 w-auto sm:h-12 md:h-[4.25rem]"
              decoding="async"
              fetchPriority="high"
            />
          </Link>

          <div className="hidden min-w-0 flex-1 md:flex md:justify-end">
            <nav
              className="inline-flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/95 p-1 shadow-sm ring-1 ring-slate-900/[0.04] dark:border-slate-600/90 dark:from-slate-800 dark:to-slate-900/95 dark:ring-white/5"
              aria-label="Navigation principale"
            >
            <NavLink to="/" end className={navClassWithIcon}>
              <LayoutTemplate className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="whitespace-nowrap">Volière</span>
            </NavLink>
            <NavLink to="/cages" className={navClassWithIcon}>
              <LayoutGrid className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="whitespace-nowrap">Cages</span>
            </NavLink>
            <NavLink to="/pigeons" className={navClassWithIcon}>
              <Bird className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="whitespace-nowrap">Pigeons</span>
            </NavLink>
            <NavLink to="/couples" className={navClassWithIcon}>
              <Heart className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="whitespace-nowrap">Couples</span>
            </NavLink>
            <NavLink to="/reproductions" className={navClassWithIcon}>
              <Egg className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="whitespace-nowrap">Repro.</span>
            </NavLink>
            <NavLink to="/sorties" className={navClassWithIcon}>
              <ClipboardList className="size-4 shrink-0 opacity-90" aria-hidden />
              <span className="whitespace-nowrap">Sorties</span>
            </NavLink>
            </nav>
          </div>

          <div className="hidden h-7 w-px shrink-0 self-center bg-slate-200 dark:bg-slate-600 md:block" aria-hidden />

          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            <ThemeHeaderToggle />
            <UserProfileMenu />
          </div>
        </div>
      </header>
      <main className="relative z-[1] mx-auto max-w-7xl px-2 pt-3 sm:px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-4">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  )
}
