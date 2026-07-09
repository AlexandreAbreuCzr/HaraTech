import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import {
  HardDrive, Link2, ArrowRight, Search,
  Cpu, Signal, Clock,
} from 'lucide-react'
import type { Device } from '../lib/types'

function statusColor(isOnline: boolean) {
  return isOnline
    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
    : 'bg-zinc-400 dark:bg-zinc-600'
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [search, setSearch] = useState('')
  const [linking, setLinking] = useState(false)
  const navigate = useNavigate()

  const fetch = () => {
    setLoading(true)
    api.dispositivos.listar()
      .then(d => setDevices(d.devices))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const handleLink = async () => {
    setLinkError('')
    if (!linkInput.trim()) return
    setLinking(true)
    try {
      await api.dispositivos.vincular(linkInput.trim().toUpperCase())
      setLinkInput('')
      fetch()
    } catch (err: any) {
      setLinkError(err.message || 'Erro ao vincular')
    } finally {
      setLinking(false)
    }
  }

  const filtered = devices.filter(d =>
    d.deviceId.toLowerCase().includes(search.toLowerCase()) ||
    d.chipId.toLowerCase().includes(search.toLowerCase())
  )

  const online = devices.filter(d => d.isOnline).length

  return (
    <Layout>
      <PageHeader
        title="Dispositivos"
        description={`${devices.length} dispositivo${devices.length !== 1 ? 's' : ''} · ${online} online`}
      />

      {/* Link device card */}
      <Card className="mb-6 animate-slide-up">
        <CardHeader>
          <CardTitle>Vincular Dispositivo</CardTitle>
        </CardHeader>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              value={linkInput}
              onChange={e => setLinkInput(e.target.value)}
              placeholder="HT-XXXXXX"
              onKeyDown={e => e.key === 'Enter' && handleLink()}
            />
          </div>
          <Button onClick={handleLink} loading={linking} icon={<Link2 />}>
            Vincular
          </Button>
        </div>
        {linkError && (
          <p className="text-sm text-red-500 mt-3">{linkError}</p>
        )}
      </Card>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[var(--text-tertiary)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por deviceId ou chipId..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none text-sm transition-all duration-150 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Device list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HardDrive className="size-6" />}
          title={search ? 'Nenhum resultado' : 'Nenhum dispositivo vinculado'}
          description={search ? 'Tente outro termo de busca' : 'Insira o código acima para vincular seu primeiro dispositivo'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((d, idx) => (
            <button
              key={d.id}
              onClick={() => navigate(`/dispositivos/${d.deviceId}`)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-brand-500/50 rounded-2xl p-5 flex items-center justify-between transition-all duration-150 text-left group cursor-pointer animate-slide-up"
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
                    <Badge variant={d.isOnline ? 'success' : 'neutral'}>
                      {d.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                      <Cpu className="size-3" /> {d.chipId}
                    </span>
                    {d.lastRssi !== null && (
                      <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
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
              <ArrowRight className="size-5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
            </button>
          ))}
        </div>
      )}
    </Layout>
  )
}
