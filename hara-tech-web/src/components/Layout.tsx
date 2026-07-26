import { type ReactNode, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { useTheme } from '../lib/theme-context'
import { BrandLogo } from './BrandLogo'
import {
  LayoutDashboard,
  HardDrive,
  Sprout,
  CalendarClock,
  History,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dispositivos', label: 'Dispositivos', icon: HardDrive },
  { to: '/culturas', label: 'Culturas', icon: Sprout },
  { to: '/programacao', label: 'Programação', icon: CalendarClock },
  { to: '/historico', label: 'Histórico', icon: History },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const currentPage = nav.find((item) => isActive(item.to))?.label ?? 'Hara Tech'

  return (
    <div className="brand-shell flex min-h-screen">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        aria-label="Navegação principal"
        className={`brand-rail fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-[var(--ink)] text-white transform transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-auto`}
      >
        <div className="flex h-24 items-center border-b border-white/10 px-5">
          <BrandLogo compact inverse />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-[0.65rem] font-bold tracking-[0.16em] text-white/35 uppercase">Operação</p>
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150
                ${isActive(item.to)
                  ? 'bg-white text-[var(--ink)] shadow-md'
                  : 'text-white/65 hover:bg-white/8 hover:text-white'
                }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-[var(--accent-water)] text-sm font-bold text-white">
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {user?.name || 'Usuário'}
              </p>
              <p className="truncate text-xs text-white/45">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="cursor-pointer rounded-lg p-1.5 text-white/45 transition-colors hover:bg-red-400/15 hover:text-red-300"
              title="Sair"
              aria-label="Sair da conta"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/88 px-4 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="-ml-2 cursor-pointer rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] lg:hidden"
              aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <nav className="hidden items-center gap-1.5 text-sm sm:flex">
              <span className="font-medium text-[var(--text-tertiary)]">Hara Tech</span>
              <ChevronRight className="size-3.5 text-[var(--text-tertiary)]" />
              <span className="font-medium text-[var(--text-primary)]">{currentPage}</span>
            </nav>
          </div>

          <button
            onClick={toggle}
            className="cursor-pointer rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </header>

        <main className="animate-fade-in mx-auto w-full max-w-7xl flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
