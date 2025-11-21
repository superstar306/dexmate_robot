import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import './App.css'
import { Layout } from './components/Layout'
import { useAuth } from './context/AuthContext'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { GroupAdminPage } from './pages/GroupAdminPage'
import { ProfilePage } from './pages/ProfilePage'
import { RobotDetailPage } from './pages/RobotDetailPage'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-shell">
        <div className="app-content" style={{ padding: '2rem' }}>
          <div className="card">Restoring session…</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Layout />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/robots/:serialNumber" element={<RobotDetailPage />} />
          <Route path="/groups" element={<GroupAdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
