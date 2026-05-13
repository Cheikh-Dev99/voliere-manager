import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'
import { resolvePostAuthPath } from './postAuthRedirect'

/**
 * Réservé aux visiteurs non connectés (connexion / inscription).
 * Si une session Firebase existe déjà : Visualisation par défaut, ou retour « intelligent »
 * si l’état de navigation le permet (voir `resolvePostAuthPath`).
 */
export function GuestRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const location = useLocation()

  if (loading) {
    return <AppLoadingScreen variant="fullscreen" message="Chargement…" subtitle="" />
  }

  if (user) {
    return <Navigate to={resolvePostAuthPath(location.state?.from?.pathname)} replace />
  }

  return children
}
