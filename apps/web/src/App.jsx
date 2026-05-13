import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { VolierePage } from './pages/VolierePage'
import { PigeonsListPage } from './pages/PigeonsListPage'
import { PigeonFormPage } from './pages/PigeonFormPage'
import { PigeonDetailPage } from './pages/PigeonDetailPage'
import { CouplesListPage } from './pages/CouplesListPage'
import { CoupleFormPage } from './pages/CoupleFormPage'
import { SortiesPage } from './pages/SortiesPage'
import { CagesListPage } from './pages/CagesListPage'
import { CageFormPage } from './pages/CageFormPage'
import { ReproductionsPage } from './pages/ReproductionsPage'
import { ReproductionFormPage } from './pages/ReproductionFormPage'
import { PigeonHealthPage } from './pages/PigeonHealthPage'
import { PigeonGenealogyPage } from './pages/PigeonGenealogyPage'
import { GuestRoute } from './router/GuestRoute'
import { ProtectedRoute } from './router/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<VolierePage />} />
        <Route path="pigeons" element={<PigeonsListPage />} />
        <Route path="pigeons/nouveau" element={<PigeonFormPage />} />
        <Route path="pigeons/:pigeonId/sante" element={<PigeonHealthPage />} />
        <Route path="pigeons/:pigeonId/genealogie" element={<PigeonGenealogyPage />} />
        <Route path="pigeons/:pigeonId/modifier" element={<PigeonFormPage />} />
        <Route path="pigeons/:pigeonId" element={<PigeonDetailPage />} />
        <Route path="couples" element={<CouplesListPage />} />
        <Route path="couples/nouveau" element={<CoupleFormPage />} />
        <Route path="reproductions" element={<ReproductionsPage />} />
        <Route path="reproductions/nouveau" element={<ReproductionFormPage />} />
        <Route path="sorties" element={<SortiesPage />} />
        <Route path="cages" element={<CagesListPage />} />
        <Route path="cages/nouveau" element={<CageFormPage />} />
        <Route path="cages/:cageId/modifier" element={<CageFormPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
