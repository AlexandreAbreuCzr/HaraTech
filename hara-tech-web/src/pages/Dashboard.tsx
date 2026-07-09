import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { culturasStore, programacoesStore } from '../lib/store'
import Layout from '../components/Layout'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { EmptyState } from '../components/ui/empty-state'
import {
  HardDrive, Sprout, CalendarClock, Wifi,
  Droplets, ArrowRight, Syringe,
} from 'lucide-react'
import type { Device, Telemetry } from '../lib/types'

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <Card className="animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className={`size-10 rounded-xl ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{label}</div>
      {sub && <div className="text-xs text-[var(--text-secondary)] mt-1">{sub}</div>}
    </Card>
  )
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [telemetries, setTelemetries] = useState<Map<string, Telemetry>>(new Map())
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const d = await api.dispositivos.listar()
        if (!mounted) return
        setDevices(d.devices)

        const telems = new Map<string, Telemetry>()
        await Promise.all(d.devices.map(async (dev) => {
          try {
            const t = await api.telemetria.ultima(dev.deviceId)
            if (t) telems.set(dev.deviceId, t)
          } catch {}
        }))
        if (mounted) setTelemetries(telems)
      } catch {
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const online = devices.filter(d => d.isOnline).length
  const culturas = culturasStore.list()
  const programacoes = programacoesStore.list()
  const ativas = programacoes.filter(p => p.ativo).length

  const avgMoisture = telemetries.size > 0
    ? Math.round(Array.from(telemetries.values()).reduce((a, t) => a + t.soilMoisture, 0) / telemetries.size)
    : null

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Visão geral do seu sistema de irrigação</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<HardDrive className="size-5 text-brand-600 dark:text-brand-400" />}
            label="Dispositivos"
            value={devices.length}
            sub={online > 0 ? `${online} online` : 'Nenhum online'}
            color="bg-brand-50 dark:bg-brand-950"
          />
          <StatCard
            icon={<Wifi className="size-5 text-emerald-600 dark:text-emerald-400" />}
            label="Online"
            value={online}
            sub={`${devices.length - online} offline`}
            color="bg-emerald-50 dark:bg-emerald-950"
          />
          <StatCard
            icon={<Sprout className="size-5 text-violet-600 dark:text-violet-400" />}
            label="Culturas"
            value={culturas.length}
            color="bg-violet-50 dark:bg-violet-950"
          />
          <StatCard
            icon={<CalendarClock className="size-5 text-amber-600 dark:text-amber-400" />}
            label="Regas Ativas"
            value={ativas}
            sub={programacoes.length > 0 ? `${programacoes.length} programações` : undefined}
            color="bg-amber-50 dark:bg-amber-950"
          />
        </div>

        {/* Moisture overview + next irrigations */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Devices */}
          <Card>
            <CardHeader>
              <CardTitle>Dispositivos</CardTitle>
              {devices.length > 0 && (
                <Badge variant="neutral">{online}/{devices.length} online</Badge>
              )}
            </CardHeader>
            {devices.length === 0 ? (
              <EmptyState
                icon={<HardDrive className="size-6" />}
                title="Nenhum dispositivo"
                description="Vá em Dispositivos para vincular um"
                action={
                  <button
                    onClick={() => navigate('/dispositivos')}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors cursor-pointer"
                  >
                    Ir para Dispositivos
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {devices.slice(0, 5).map((d, idx) => {
                  const t = telemetries.get(d.deviceId)
                  return (
                    <button
                      key={d.id}
                      onClick={() => navigate(`/dispositivos/${d.deviceId}`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]/40 hover:bg-[var(--bg-tertiary)] transition-all duration-150 text-left group cursor-pointer"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`size-2.5 rounded-full ${d.isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-[var(--text-tertiary)]'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--text-primary)] font-mono">{d.deviceId}</span>
                            {d.name && <span className="text-xs text-[var(--text-tertiary)]">— {d.name}</span>}
                          </div>
                          {t && (
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                                <Droplets className="size-3" /> {t.soilMoisture}%
                              </span>
                              <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                                <Syringe className="size-3" /> {t.pumpOn ? 'Ligada' : 'Desligada'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="size-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
                    </button>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Next irrigations */}
          <Card>
            <CardHeader>
              <CardTitle>Próximas Irrigações</CardTitle>
              {ativas > 0 && <Badge variant="success">{ativas} ativas</Badge>}
            </CardHeader>
            {programacoes.filter(p => p.ativo).length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="size-6" />}
                title="Nenhuma programação ativa"
                description="Crie programações em Programação para irrigar automaticamente"
                action={
                  <button
                    onClick={() => navigate('/programacao')}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 transition-colors cursor-pointer"
                  >
                    Ir para Programação
                  </button>
                }
              />
            ) : (
              <div className="space-y-2">
                {programacoes.filter(p => p.ativo).slice(0, 5).map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]/40"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                        <Sprout className="size-4 text-brand-600 dark:text-brand-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{p.culturaNome}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{p.zonaNome}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{p.horario}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {p.diasSemana.map(d => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d]).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Moisture overview */}
        {devices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Umidade do Solo</CardTitle>
              {avgMoisture !== null && (
                <Badge variant={avgMoisture < 40 ? 'warning' : avgMoisture > 80 ? 'info' : 'success'}>
                  Média {avgMoisture}%
                </Badge>
              )}
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {devices.slice(0, 8).map(d => {
                const t = telemetries.get(d.deviceId)
                const moisture = t?.soilMoisture ?? null
                const threshold = 35
                const color = moisture === null ? 'bg-[var(--bg-tertiary)]'
                  : moisture < threshold ? 'bg-red-500'
                  : moisture < 70 ? 'bg-amber-500'
                  : 'bg-blue-500'
                const status = moisture === null ? '—'
                  : moisture < threshold ? 'Seco'
                  : moisture < 70 ? 'Úmido'
                  : 'Muito úmido'

                return (
                  <div key={d.id} className="p-4 rounded-xl bg-[var(--bg-tertiary)]/40">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{d.deviceId}</span>
                      <div className={`size-2 rounded-full ${d.isOnline ? 'bg-emerald-500' : 'bg-[var(--text-tertiary)]'}`} />
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${color}`}
                            style={{ width: `${moisture ?? 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-lg font-bold text-[var(--text-primary)]">
                        {moisture !== null ? `${moisture}%` : '—'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1.5">{status}</p>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
