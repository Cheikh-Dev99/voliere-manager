import { createContext, useContext } from 'react'

/** @typedef {'light' | 'dark' | 'system'} ThemePreference */

/** @type {import('react').Context<{ preference: ThemePreference, setPreference: (p: ThemePreference) => void, resolved: 'light' | 'dark' }>} */
export const ThemeContext = createContext({
  preference: 'light',
  setPreference: () => {},
  resolved: 'light',
})

export function useAppTheme() {
  return useContext(ThemeContext)
}
