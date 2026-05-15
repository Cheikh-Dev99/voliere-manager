import { Monitor, Moon, Sun } from 'lucide-react'
import { useAppTheme } from './themeContext'

const btn =
  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 sm:text-sm'

/**
 * Sélecteur Clair / Système / Sombre (réutilisable header, login, profil).
 */
export function ThemeModeControl({ className = '' }) {
  const { preference, setPreference } = useAppTheme()

  return (
    <div className={`flex flex-wrap gap-1 rounded-xl border border-slate-200/90 bg-slate-50/80 p-1 dark:border-slate-600 dark:bg-slate-800/60 ${className}`}>
      <button
        type="button"
        onClick={() => setPreference('light')}
        className={`${btn} ${
          preference === 'light'
            ? 'border-teal-400 bg-white text-teal-900 shadow-sm dark:border-teal-500/40 dark:bg-slate-700 dark:text-teal-100'
            : 'border-transparent bg-transparent text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-700/80'
        }`}
        aria-pressed={preference === 'light'}
      >
        <Sun className="size-3.5 shrink-0 sm:size-4" aria-hidden />
        Clair
      </button>
      <button
        type="button"
        onClick={() => setPreference('system')}
        className={`${btn} ${
          preference === 'system'
            ? 'border-teal-400 bg-white text-teal-900 shadow-sm dark:border-teal-500/40 dark:bg-slate-700 dark:text-teal-100'
            : 'border-transparent bg-transparent text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-700/80'
        }`}
        aria-pressed={preference === 'system'}
      >
        <Monitor className="size-3.5 shrink-0 sm:size-4" aria-hidden />
        Auto
      </button>
      <button
        type="button"
        onClick={() => setPreference('dark')}
        className={`${btn} ${
          preference === 'dark'
            ? 'border-teal-400 bg-white text-teal-900 shadow-sm dark:border-teal-500/40 dark:bg-slate-700 dark:text-teal-100'
            : 'border-transparent bg-transparent text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-700/80'
        }`}
        aria-pressed={preference === 'dark'}
      >
        <Moon className="size-3.5 shrink-0 sm:size-4" aria-hidden />
        Sombre
      </button>
    </div>
  )
}
