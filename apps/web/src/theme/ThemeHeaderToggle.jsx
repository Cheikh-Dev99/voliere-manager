import { Moon, Sun } from 'lucide-react'
import { useAppTheme } from './themeContext'
import { dmIconButton } from './voliereDarkUi'

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
      className={`${dmIconButton} text-amber-600 dark:text-amber-200`}
      aria-label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
    >
      {isDark ? <Moon className="size-5" strokeWidth={2.2} aria-hidden /> : <Sun className="size-5" strokeWidth={2.2} aria-hidden />}
    </button>
  )
}
