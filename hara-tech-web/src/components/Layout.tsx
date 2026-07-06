import { type ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  LayoutDashboard, HardDrive, Sprout, CalendarClock,
  History, LogOut, Menu, X
} from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dispositivos', label: 'Dispositivos', icon: HardDrive },
  { to: '/culturas', label: 'Culturas', icon: Sprout },
  { to: '/programacao', label: 'Programação', icon: CalendarClock },
  { to: '/historico', label: 'Histórico', icon: History },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen flex bg-black">
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-zinc-950 border-r border-zinc-800 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto`}>
        <div className="h-14 flex items-center gap-2 px-5 border-b border-zinc-800">
          <img src="/logo.jpeg" alt="Hara" className="h-6" />
        </div>
        <nav className="p-3 space-y-1">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-800">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500">
            <span className="truncate flex-1">{user?.email}</span>
            <button onClick={handleLogout} className="text-zinc-600 hover:text-red-400 transition-colors">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40 flex items-center px-4 lg:hidden">
          <button onClick={() => setOpen(!open)} className="text-zinc-400 hover:text-white mr-3">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <img src="/logo.jpeg" alt="Hara" className="h-5" />
        </header>
        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
