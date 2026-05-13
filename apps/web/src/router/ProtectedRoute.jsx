import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import { AppLoadingScreen } from '../components/loading/AppLoadingScreen'

/**
 * Accès réservé aux utilisateurs Firebase connectés.
 * Les données sensibles restent protégées côté serveur (règles Firestore / Storage).
 */
export function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const location = useLocation()

  // Un utilisateur déjà connu (ex. juste après inscription) ne doit pas rester bloqué
  // derrière « Chargement… » si `loading` est encore true le temps que Firebase finalise.
  if (user) {
    return children
  }

  if (loading) {
    return <AppLoadingScreen variant="fullscreen" message="Chargement…" subtitle="Préparation de ta session sécurisée." />
  }

  return <Navigate to="/login" replace state={{ from: location }} />
}
