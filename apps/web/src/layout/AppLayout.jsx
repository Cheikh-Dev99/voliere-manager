import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  Bird,
  Heart,
  ClipboardList,
  LayoutGrid,
  Egg,
  PanelsTopLeft,
} from 'lucide-react'
import { UserProfileMenu } from '../components/layout/UserProfileMenu'
import { SiteBackgroundDecor } from '../components/layout/SiteBackgroundDecor'
import logoUrl from '../assets/logo.png'

/** État actif / repos — même famille pour toutes les entrées (icône + libellé). */
const navInactive =
  'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2'
const navActive =
  'bg-teal-100 text-teal-900 shadow-sm ring-1 ring-teal-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2'

function navClassWithIcon({ isActive }) {
  return `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${isActive ? navActive : navInactive}`
}

export function AppLayout() {
  return (
    <div className="app-root relative min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-teal-50/40 text-slate-900">
      <SiteBackgroundDecor />
      <header className="app-header-no-print relative sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-4 sm:py-3">
          <Link
            to="/"
            className="flex shrink-0 items-center rounded-xl outline-none ring-offset-2 transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            aria-label="Volière Manager — accueil"
          >
            <img
              src={logoUrl}
              alt="Volière Manager"
              className="h-12 w-auto sm:h-14 md:h-[4.25rem]"
              decoding="async"
              fetchPriority="high"
            />
          </Link>

          <div className="flex min-w-0 flex-col gap-2.5 sm:flex-1 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <nav
              className="flex flex-wrap items-center justify-start gap-1 sm:justify-end md:inline-flex md:flex-nowrap md:overflow-x-auto md:rounded-2xl md:border md:border-slate-200/90 md:bg-gradient-to-b md:from-white md:to-slate-50/95 md:p-1 md:shadow-sm md:ring-1 md:ring-slate-900/[0.04]"
              aria-label="Navigation principale"
            >
              <NavLink to="/" end className={navClassWithIcon}>
                <PanelsTopLeft className="size-4 shrink-0 opacity-90" aria-hidden />
                <span className="whitespace-nowrap">Visualisation</span>
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
                <span className="whitespace-nowrap">Reproductions</span>
              </NavLink>
              <NavLink to="/sorties" className={navClassWithIcon}>
                <ClipboardList className="size-4 shrink-0 opacity-90" aria-hidden />
                <span className="whitespace-nowrap">Sorties</span>
              </NavLink>
            </nav>

            <div className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />

            <UserProfileMenu />
          </div>
        </div>
      </header>
      <main className="relative z-[1] mx-auto max-w-7xl px-3 py-4 sm:px-4">
        <Outlet />
      </main>
    </div>
  )
}
