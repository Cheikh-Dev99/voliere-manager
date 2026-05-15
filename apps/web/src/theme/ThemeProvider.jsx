import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './themeContext'

const STORAGE_KEY = 'voliere-manager:theme-preference'

function readStoredPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return 'light'
}

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function applyDomClass(resolved) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() =>
    typeof window !== 'undefined' ? readStoredPreference() : 'light',
  )
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined' ? systemPrefersDark() : false,
  )

  const resolved = useMemo(() => {
    if (preference === 'system') return systemDark ? 'dark' : 'light'
    return preference
  }, [preference, systemDark])

  useEffect(() => {
    applyDomClass(resolved)
  }, [resolved])

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return undefined
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setPreference = useCallback((next) => {
    setPreferenceState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(() => ({ preference, setPreference, resolved }), [preference, setPreference, resolved])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
