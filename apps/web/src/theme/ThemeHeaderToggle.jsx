import { Moon, Sun } from 'lucide-react'
import { useAppTheme } from './themeContext'

/**
 * Bascule rapide clair / sombre (icône = thème actuellement affiché).
 * Le choix « système » reste disponible dans le menu profil (Apparence).
 */
export function ThemeHeaderToggle() {
  const { resolved, setPreference } = useAppTheme()
  const isDark = resolved === 'dark'

  return (
    <button
      type="button"
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-amber-600 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/45 dark:border-slate-600 dark:bg-slate-800 dark:text-amber-200 dark:hover:bg-slate-700"
      aria-label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
    >
      {isDark ? <Moon className="size-5" strokeWidth={2.2} aria-hidden /> : <Sun className="size-5" strokeWidth={2.2} aria-hidden />}
    </button>
  )
}
