import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { useTheme } from '../lib/theme-context'
import { BrandLogo } from './BrandLogo'
import {
  CalendarClock, ChevronRight, HardDrive, History, LayoutDashboard, LogOut,
  Menu, Moon, PanelLeftClose, PanelLeftOpen, Plus, Search, Sprout, Sun, X,
} from 'lucide-react'

const nav = [
  { to: '/', label: 'Visão geral', shortLabel: 'Início', icon: LayoutDashboard, hint: 'Resumo da operação' },
  { to: '/dispositivos', label: 'Dispositivos', shortLabel: 'Dispositivos', icon: HardDrive, hint: 'Sensores e controles' },
  { to: '/culturas', label: 'Culturas', shortLabel: 'Culturas', icon: Sprout, hint: 'Parâmetros de cultivo' },
  { to: '/programacao', label: 'Programação', shortLabel: 'Agenda', icon: CalendarClock, hint: 'Rotinas de irrigação' },
  { to: '/historico', label: 'Histórico', shortLabel: 'Histórico', icon: History, hint: 'Eventos confirmados' },
]

function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const actions = useMemo(() => [
    ...nav.map((item) => ({ ...item, group: 'Navegar' })),
    { to: '/dispositivos?link=1', label: 'Vincular dispositivo', icon: Plus, hint: 'Adicionar um novo controlador', group: 'Ação rápida' },
    { to: '/culturas?new=1', label: 'Cadastrar cultura', icon: Plus, hint: 'Definir parâmetros de uma planta', group: 'Ação rápida' },
    { to: '/programacao?new=1', label: 'Criar programação', icon: Plus, hint: 'Planejar uma nova rotina', group: 'Ação rápida' },
  ], [])
  const filtered = actions.filter((action) => `${action.label} ${action.hint}`.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    if (!open) return
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  if (!open) return null
  const choose = (to: string) => { navigate(to); onClose() }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" role="presentation">
      <button className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-sm" onClick={onClose} aria-label="Fechar busca" />
      <section role="dialog" aria-modal="true" aria-label="Busca rápida" className="command-panel relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] shadow-2xl animate-scale-in">
        <div className="flex items-center gap-3 border-b border-[var(--border-primary)] px-4">
          <Search className="size-4 text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
              if (event.key === 'Enter' && filtered[0]) choose(filtered[0].to)
            }}
            placeholder="Buscar página ou ação…"
            className="h-14 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
          <kbd className="keycap">esc</kbd>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length ? filtered.map((action, index) => (
            <button key={`${action.group}-${action.label}`} onClick={() => choose(action.to)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--bg-tertiary)] ${index === 0 ? 'bg-[var(--bg-tertiary)]/70' : ''}`}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"><action.icon className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--text-primary)]">{action.label}</span><span className="block truncate text-xs text-[var(--text-tertiary)]">{action.hint}</span></span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{action.group}</span>
            </button>
          )) : <p className="px-4 py-10 text-center text-sm text-[var(--text-tertiary)]">Nenhum resultado para “{query}”.</p>}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--border-secondary)] px-4 py-2.5 text-[11px] text-[var(--text-tertiary)]"><span>Enter para abrir</span><span>Busca rápida Hara</span></div>
      </section>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [compact, setCompact] = useState(() => localStorage.getItem('hara_sidebar_compact') === 'true')
  const [commandOpen, setCommandOpen] = useState(false)
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const handleLogout = () => { logout(); navigate('/login') }
  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  const currentPage = nav.find((item) => isActive(item.to))?.label ?? 'Hara Tech'

  useEffect(() => { localStorage.setItem('hara_sidebar_compact', String(compact)) }, [compact])
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen((value) => !value) }
      if (event.key === 'Escape') { setCommandOpen(false); setSidebarOpen(false) }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  return (
    <div className="brand-shell flex min-h-screen">
      {sidebarOpen && <button className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />}
      <aside aria-label="Navegação principal" className={`brand-rail fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/8 bg-[var(--ink)] text-white transition-all duration-200 lg:sticky lg:top-0 lg:h-screen ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${compact ? 'w-[84px]' : 'w-[264px]'}`}>
        <div className={`flex h-20 items-center border-b border-white/8 ${compact ? 'justify-center px-3' : 'justify-between px-5'}`}>
          <BrandLogo compact inverse iconOnly={compact} />
          {!compact && <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-white/55 hover:bg-white/8 hover:text-white lg:hidden" aria-label="Fechar menu"><X className="size-4" /></button>}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {!compact && <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">Operação</p>}
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setSidebarOpen(false)} title={compact ? item.label : undefined} className={`nav-item group flex items-center rounded-xl text-sm transition-colors ${compact ? 'h-12 justify-center px-2' : 'gap-3 px-3 py-2.5'} ${isActive(item.to) ? 'active bg-white text-[var(--ink)]' : 'text-white/58 hover:bg-white/7 hover:text-white'}`}>
              <item.icon className="size-[18px] shrink-0" />{!compact && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/8 p-3">
          <button onClick={() => setCompact((value) => !value)} className={`hidden w-full items-center rounded-xl text-white/45 transition-colors hover:bg-white/7 hover:text-white lg:flex ${compact ? 'h-10 justify-center' : 'gap-3 px-3 py-2'}`} title={compact ? 'Expandir menu' : 'Recolher menu'}>
            {compact ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /><span className="text-xs font-medium">Recolher menu</span></>}
          </button>
          <div className={`flex items-center rounded-xl bg-white/[0.06] ${compact ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}`}>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-leaf)] text-xs font-bold text-white">{user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}</div>
            {!compact && <><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{user?.name || 'Usuário'}</p><p className="truncate text-[11px] text-white/40">{user?.email}</p></div><button onClick={handleLogout} className="rounded-lg p-1.5 text-white/40 hover:bg-red-400/10 hover:text-red-300" title="Sair" aria-label="Sair da conta"><LogOut className="size-4" /></button></>}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border-secondary)] bg-[var(--bg-primary)]/88 px-4 backdrop-blur-xl lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="-ml-2 rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] lg:hidden" aria-label="Abrir menu"><Menu className="size-5" /></button>
            <div className="min-w-0"><div className="hidden items-center gap-1.5 text-xs sm:flex"><span className="text-[var(--text-tertiary)]">Painel</span><ChevronRight className="size-3 text-[var(--text-tertiary)]" /><span className="truncate font-semibold text-[var(--text-primary)]">{currentPage}</span></div><span className="block truncate text-sm font-semibold text-[var(--text-primary)] sm:hidden">{currentPage}</span></div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCommandOpen(true)} className="hidden h-9 min-w-48 items-center gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 text-left text-xs text-[var(--text-tertiary)] shadow-sm transition-colors hover:border-[var(--text-tertiary)] md:flex"><Search className="size-3.5" /><span className="flex-1">Buscar ou acessar…</span><kbd className="keycap">Ctrl K</kbd></button>
            <button onClick={() => setCommandOpen(true)} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] md:hidden" aria-label="Busca rápida"><Search className="size-4" /></button>
            <button onClick={toggle} className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]" title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'} aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>{theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex h-16 items-center justify-around rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-elevated)]/94 px-2 shadow-xl backdrop-blur-xl lg:hidden" aria-label="Navegação móvel">
        {nav.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={`flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-semibold ${isActive(item.to) ? 'text-[var(--accent-leaf)]' : 'text-[var(--text-tertiary)]'}`}><item.icon className="size-[18px]" /><span>{item.shortLabel}</span></NavLink>)}
      </nav>
      {commandOpen && <CommandMenu open onClose={() => setCommandOpen(false)} />}
    </div>
  )
}
