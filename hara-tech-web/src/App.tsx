import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import { useAuth } from './lib/auth-context'
import { ThemeProvider } from './lib/theme'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Devices from './pages/Devices'
import DeviceDetail from './pages/DeviceDetail'
import Plants from './pages/Plants'
import Schedules from './pages/Schedules'
import History from './pages/History'
import Landing from './pages/Landing'
import { Skeleton } from './components/ui/skeleton'
import type { ReactNode } from 'react'

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Public({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Skeleton className="h-8 w-32" />
    </div>
  )
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

function Home() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-white p-8">
      <div className="mx-auto max-w-7xl space-y-5 pt-24">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 max-w-2xl" />
        <Skeleton className="h-5 max-w-xl" />
      </div>
    </div>
  )
  return user ? <Dashboard /> : <Landing />
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Public><Login /></Public>} />
            <Route path="/register" element={<Public><Register /></Public>} />
            <Route path="/" element={<Home />} />
            <Route path="/dispositivos" element={<Protected><Devices /></Protected>} />
            <Route path="/dispositivos/:deviceId" element={<Protected><DeviceDetail /></Protected>} />
            <Route path="/culturas" element={<Protected><Plants /></Protected>} />
            <Route path="/programacao" element={<Protected><Schedules /></Protected>} />
            <Route path="/historico" element={<Protected><History /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
