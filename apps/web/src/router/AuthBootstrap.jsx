import { useEffect } from 'react'
import useAuthStore from '../stores/authStore'

/**
 * Initialise le listener Firebase Auth une seule fois au montage.
 */
export function AuthBootstrap({ children }) {
  useEffect(() => {
    const unsub = useAuthStore.getState().init()
    return unsub
  }, [])
  return children
}
