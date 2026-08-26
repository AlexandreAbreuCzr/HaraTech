import { type ReactNode, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { BrandLogo } from './BrandLogo'
import { CalendarClock, HardDrive, History, LayoutDashboard, LogOut, Menu, Sprout, X } from 'lucide-react'

const nav = [
  { to: '/', label: 'Visão geral', shortLabel: 'Início', icon: LayoutDashboard },
  { to: '/dispositivos', label: 'Dispositivos', shortLabel: 'Dispositivos', icon: HardDrive },
  { to: '/culturas', label: 'Culturas', shortLabel: 'Culturas', icon: Sprout },
  { to: '/programacao', label: 'Programação', shortLabel: 'Agenda', icon: CalendarClock },
  { to: '/historico', label: 'Histórico', shortLabel: 'Histórico', icon: History },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const currentPage = nav.find((item) => isActive(item.to))?.label ?? 'Hara Tech'
  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] lg:flex">
      {sidebarOpen && <button className="fixed inset-0 z-40 bg-black/25 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-[var(--border-primary)] bg-white transition-transform lg:sticky lg:top-0 lg:h-screen ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} aria-label="Navegação principal">
        <div className="flex h-17 items-center justify-between border-b border-[var(--border-primary)] px-5">
          <BrandLogo compact />
          <button onClick={() => setSidebarOpen(false)} className="p-2 text-[var(--text-secondary)] lg:hidden" aria-label="Fechar menu"><X className="size-4" /></button>
        </div>
        <nav className="flex-1 p-3 pt-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Menu</p>
          <div className="space-y-1">
            {nav.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setSidebarOpen(false)} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${isActive(item.to) ? 'bg-black text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-black'}`}><item.icon className="size-4" strokeWidth={1.75} />{item.label}</NavLink>)}
          </div>
        </nav>
        <div className="border-t border-[var(--border-primary)] p-4">
          <div className="mb-3 min-w-0"><p className="truncate text-sm font-medium text-black">{user?.name || 'Usuário'}</p><p className="truncate text-xs text-[var(--text-tertiary)]">{user?.email}</p></div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-black"><LogOut className="size-3.5" /> Sair</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-17 items-center border-b border-[var(--border-primary)] bg-white/95 px-4 backdrop-blur sm:px-7 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="-ml-2 mr-3 p-2 text-black" aria-label="Abrir menu"><Menu className="size-5" /></button><span className="text-sm font-semibold">{currentPage}</span>
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-7 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-[var(--border-primary)] bg-white px-2 lg:hidden" aria-label="Navegação móvel">
        {nav.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={`flex min-w-14 flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium ${isActive(item.to) ? 'text-black' : 'text-[var(--text-tertiary)]'}`}><item.icon className="size-[18px]" strokeWidth={isActive(item.to) ? 2.25 : 1.6} /><span>{item.shortLabel}</span></NavLink>)}
      </nav>
    </div>
  )
}
