import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import Layout from '../components/Layout'
import { Card, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import {
  HardDrive, Link2, ArrowRight, Search,
  Cpu, Signal, Clock, RefreshCw, Wifi, WifiOff,
} from 'lucide-react'
import type { Device } from '../lib/types'

function statusColor(isOnline: boolean) {
  return isOnline
    ? 'bg-black'
    : 'bg-[#b5b5b5]'
}

export default function Devices() {
  const [searchParams] = useSearchParams()
  const focusLink = searchParams.get('link') === '1'
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [linking, setLinking] = useState(false)
  const linkInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.dispositivos.listar()
      setDevices(response.devices)
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : 'Não foi possível carregar os dispositivos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchDevices()
    if (focusLink) window.setTimeout(() => linkInputRef.current?.focus(), 80)
  }, [fetchDevices, focusLink])

  const handleLink = async () => {
    setLinkError('')
    if (!linkInput.trim()) return
    setLinking(true)
    try {
      await api.dispositivos.vincular(linkInput.trim().toUpperCase())
      setLinkInput('')
      await fetchDevices()
    } catch (err) {
      setLinkError(err instanceof ApiError ? err.message : 'Erro ao vincular o dispositivo.')
    } finally {
      setLinking(false)
    }
  }

  const filtered = devices.filter(d =>
    (statusFilter === 'all' || (statusFilter === 'online' ? d.isOnline : !d.isOnline)) &&
    (d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
    d.chipId.toLowerCase().includes(search.toLowerCase()) ||
    d.name?.toLowerCase().includes(search.toLowerCase()))
  )

  const online = devices.filter(d => d.isOnline).length

  return (
    <Layout>
      <PageHeader
        title="Dispositivos"
        description={`${devices.length} dispositivo${devices.length !== 1 ? 's' : ''} · ${online} online`}
        actions={<Button variant="secondary" size="sm" onClick={() => void fetchDevices()} icon={<RefreshCw />}>Atualizar</Button>}
      />

      {/* Link device card */}
      <Card className="mb-7 animate-slide-up">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="lg:max-w-sm lg:flex-1">
            <CardTitle>Vincular dispositivo</CardTitle>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">Use o código impresso no controlador Hara.</p>
          </div>
          <div className="flex flex-1 gap-2">
            <div className="flex-1">
            <Input
              ref={linkInputRef}
              value={linkInput}
              onChange={e => setLinkInput(e.target.value)}
              placeholder="HT-XXXXXX"
              onKeyDown={e => e.key === 'Enter' && handleLink()}
              className="font-mono uppercase tracking-wider"
            />
            </div>
            <Button onClick={handleLink} loading={linking} icon={<Link2 />}>Vincular</Button>
          </div>
        </div>
        {linkError && (
          <p className="text-sm text-red-500 mt-3">{linkError}</p>
        )}
      </Card>

      {/* Search */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar dispositivo…" className="h-10 w-full rounded-lg border border-[var(--border-primary)] bg-white pl-10 pr-4 text-sm text-black outline-none placeholder:text-[var(--text-tertiary)] focus:border-black" />
        </div>
        <div className="flex rounded-lg border border-[var(--border-primary)] bg-white p-1">
          {([
            { value: 'all', label: 'Todos', icon: HardDrive },
            { value: 'online', label: 'Online', icon: Wifi },
            { value: 'offline', label: 'Offline', icon: WifiOff },
          ] as const).map(item => <button key={item.value} onClick={() => setStatusFilter(item.value)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === item.value ? 'bg-black text-white' : 'text-[var(--text-tertiary)] hover:text-black'}`}><item.icon className="size-3.5" />{item.label}</button>)}
        </div>
      </div>

      {/* Device list */}
      {loading ? (
        <div className="border-t border-[var(--border-primary)]">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HardDrive className="size-6" />}
          title={search || statusFilter !== 'all' ? 'Nenhum resultado' : 'Nenhum dispositivo vinculado'}
          description={search || statusFilter !== 'all' ? 'Ajuste a busca ou o filtro de status.' : 'Insira o código acima para vincular seu primeiro dispositivo'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((d, idx) => (
            <button
              key={d.id}
              onClick={() => navigate(`/dispositivos/${d.deviceId}`)}
              className="group flex w-full items-center justify-between border-b border-[var(--border-primary)] bg-transparent px-2 py-5 text-left transition-colors hover:bg-[#f5f5f5] animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`size-3 rounded-full ${statusColor(d.isOnline)}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-[var(--text-primary)] font-mono">{d.deviceId}</span>
                    {d.name && (
                      <span className="text-sm text-[var(--text-tertiary)]">— {d.name}</span>
                    )}
                    <Badge variant={d.isOnline ? 'success' : 'neutral'} className="hidden sm:inline-flex">
                      {d.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-4">
                    <span className="hidden items-center gap-1 text-xs text-[var(--text-tertiary)] sm:flex">
                      <Cpu className="size-3" /> {d.chipId}
                    </span>
                    {d.lastRssi !== null && (
                      <span className="hidden items-center gap-1 text-xs text-[var(--text-tertiary)] md:flex">
                        <Signal className="size-3" /> {d.lastRssi} dBm
                      </span>
                    )}
                    {d.lastSeen && (
                      <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock className="size-3" /> {new Date(d.lastSeen).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ArrowRight className="size-5 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-secondary)]" />
            </button>
          ))}
        </div>
      )}
    </Layout>
  )
}
