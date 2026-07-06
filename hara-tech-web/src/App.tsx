import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import DeviceDetail from './pages/DeviceDetail'
import Plants from './pages/Plants'
import Schedules from './pages/Schedules'
import History from './pages/History'
import type { ReactNode } from 'react'

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Public({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Carregando...</div>
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route path="/register" element={<Public><Register /></Public>} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/dispositivos" element={<Protected><Devices /></Protected>} />
          <Route path="/dispositivos/:deviceId" element={<Protected><DeviceDetail /></Protected>} />
          <Route path="/culturas" element={<Protected><Plants /></Protected>} />
          <Route path="/programacao" element={<Protected><Schedules /></Protected>} />
          <Route path="/historico" element={<Protected><History /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
