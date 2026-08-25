import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { culturasStore, programacoesStore } from '../lib/store'
import Layout from '../components/Layout'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { EmptyState } from '../components/ui/empty-state'
import {
  ArrowRight, CalendarClock, CheckCircle2, Droplets, Gauge, HardDrive,
  Plus, RefreshCw, Sprout, Wifi, WifiOff, Zap,
} from 'lucide-react'
import type { Device, Telemetry } from '../lib/types'

function MetricCard({ icon, label, value, detail, tone = 'leaf', onClick }: {
  icon: React.ReactNode
  label: string
  value: string | number
  detail: string
  tone?: 'leaf' | 'water' | 'sun' | 'neutral'
  onClick?: () => void
}) {
  const toneClass = {
    leaf: 'bg-[var(--accent-leaf-soft)] text-[var(--accent-leaf)]',
    water: 'bg-[var(--accent-water-soft)] text-[var(--accent-water)]',
    sun: 'bg-[var(--accent-sun-soft)] text-[var(--accent-sun)]',
    neutral: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  }[tone]

  return (
    <button onClick={onClick} className="metric-card animate-slide-up flex w-full flex-col rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 text-left shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <span className={`flex size-9 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
        {onClick && <ArrowRight className="size-4 text-[var(--text-tertiary)]" />}
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{label}</p><p className="mt-1 text-2xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">{value}</p></div>
        <p className="pb-1 text-right text-xs text-[var(--text-tertiary)]">{detail}</p>
      </div>
    </button>
  )
}

function MoistureRing({ value }: { value: number | null }) {
  const safeValue = value ?? 0
  const color = value === null ? 'var(--text-tertiary)' : value < 35 ? '#dc4b4b' : value < 65 ? 'var(--accent-sun)' : 'var(--accent-water)'
  return (
    <div className="relative flex size-28 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${color} ${safeValue * 3.6}deg, rgb(255 255 255 / 0.1) 0deg)` }}>
      <div className="flex size-[88px] flex-col items-center justify-center rounded-full bg-[var(--ink)]">
        <Droplets className="mb-1 size-4 text-[var(--accent-water)]" />
        <span className="text-2xl font-bold tracking-tight text-white">{value === null ? '—' : `${value}%`}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/40">umidade média</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [telemetries, setTelemetries] = useState<Map<string, Telemetry>>(new Map())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const response = await api.dispositivos.listar()
      setDevices(response.devices)
      const results = await Promise.all(response.devices.map(async (device) => {
        try { return [device.deviceId, await api.telemetria.ultima(device.deviceId)] as const }
        catch { return [device.deviceId, null] as const }
      }))
      setTelemetries(new Map(results.filter((item): item is readonly [string, Telemetry] => item[1] !== null)))
      setUpdatedAt(new Date())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar a operação.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const online = devices.filter((device) => device.isOnline).length
  const offline = devices.length - online
  const culturas = culturasStore.list()
  const programacoes = programacoesStore.list()
  const activePlans = programacoes.filter((plan) => plan.ativo)
  const avgMoisture = telemetries.size ? Math.round(Array.from(telemetries.values()).reduce((sum, telemetry) => sum + telemetry.soilMoisture, 0) / telemetries.size) : null
  const operationHealthy = devices.length > 0 && offline === 0
  const firstName = 'sua operação'

  if (loading) return (
    <Layout><div className="space-y-6"><div className="space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></div><Skeleton className="h-52 w-full" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32" />)}</div><div className="grid gap-5 xl:grid-cols-5"><Skeleton className="h-72 xl:col-span-3" /><Skeleton className="h-72 xl:col-span-2" /></div></div></Layout>
  )

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 animate-fade-in sm:flex-row sm:items-end sm:justify-between">
          <div><p className="brand-overline mb-2">Centro de controle</p><h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.04em] text-[var(--text-primary)]">Visão geral</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Acompanhe {firstName} e aja sem perder tempo.</p></div>
          <div className="flex items-center gap-3">
            {updatedAt && <span className="hidden text-xs text-[var(--text-tertiary)] sm:block">Atualizado às {updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
            <Button variant="secondary" size="sm" onClick={() => void load(true)} loading={refreshing} icon={<RefreshCw />}>Atualizar</Button>
          </div>
        </header>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}

        <section className="overflow-hidden rounded-3xl bg-[var(--ink)] text-white shadow-lg animate-slide-up">
          <div className="relative grid min-h-52 gap-6 p-6 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full border border-white/8" />
            <div className="relative max-w-2xl">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/80">
                  <span className={`size-2 rounded-full ${operationHealthy ? 'status-live bg-emerald-400' : devices.length ? 'bg-amber-400' : 'bg-white/35'}`} />
                  {operationHealthy ? 'Operação normal' : devices.length ? `${offline} dispositivo${offline !== 1 ? 's' : ''} offline` : 'Configuração inicial'}
                </span>
                {activePlans.length > 0 && <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55">{activePlans.length} rotina{activePlans.length !== 1 ? 's' : ''} ativa{activePlans.length !== 1 ? 's' : ''}</span>}
              </div>
              <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-[-0.035em] sm:text-3xl">
                {devices.length === 0 ? 'Comece conectando seu primeiro dispositivo.' : operationHealthy ? 'Tudo funcionando como deveria.' : 'Sua atenção é necessária em alguns pontos.'}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
                {devices.length === 0 ? 'Vincule o controlador Hara para acompanhar sensores, zonas e irrigação em tempo real.' : `${online} de ${devices.length} dispositivos conectados e ${telemetries.size} leituras recentes disponíveis.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate(devices.length ? '/dispositivos' : '/dispositivos')} icon={devices.length ? <HardDrive /> : <Plus />} className="!bg-white !text-[var(--ink)] hover:!bg-white/90">{devices.length ? 'Ver dispositivos' : 'Vincular dispositivo'}</Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/programacao')} icon={<CalendarClock />} className="!text-white/65 hover:!bg-white/10 hover:!text-white">Abrir agenda</Button>
              </div>
            </div>
            <div className="relative hidden pr-5 lg:block"><MoistureRing value={avgMoisture} /></div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard icon={<Wifi className="size-[18px]" />} label="Conectados" value={`${online}/${devices.length}`} detail={offline ? `${offline} offline` : 'Todos online'} onClick={() => navigate('/dispositivos')} />
          <MetricCard icon={<Gauge className="size-[18px]" />} label="Umidade média" value={avgMoisture === null ? '—' : `${avgMoisture}%`} detail={avgMoisture === null ? 'Sem leitura' : avgMoisture < 35 ? 'Solo seco' : avgMoisture < 70 ? 'Faixa moderada' : 'Solo úmido'} tone="water" />
          <MetricCard icon={<Sprout className="size-[18px]" />} label="Culturas" value={culturas.length} detail="perfis salvos" onClick={() => navigate('/culturas')} />
          <MetricCard icon={<CalendarClock className="size-[18px]" />} label="Rotinas ativas" value={activePlans.length} detail={`${programacoes.length} no total`} tone="sun" onClick={() => navigate('/programacao')} />
        </section>

        <section className="grid gap-5 xl:grid-cols-5">
          <Card className="xl:col-span-3">
            <CardHeader><div><CardTitle>Dispositivos</CardTitle><p className="mt-1 text-xs text-[var(--text-tertiary)]">Estado e leitura mais recente</p></div>{devices.length > 0 && <button onClick={() => navigate('/dispositivos')} className="text-xs font-semibold text-[var(--accent-leaf)] hover:underline">Ver todos</button>}</CardHeader>
            {devices.length === 0 ? <EmptyState icon={<HardDrive className="size-6" />} title="Nenhum dispositivo" description="Vincule um controlador para começar a monitorar." action={<Button size="sm" onClick={() => navigate('/dispositivos')} icon={<Plus />}>Vincular agora</Button>} /> : (
              <div className="space-y-1">
                {devices.slice(0, 6).map((device) => {
                  const telemetry = telemetries.get(device.deviceId)
                  return <button key={device.id} onClick={() => navigate(`/dispositivos/${device.deviceId}`)} className="interactive-row flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${device.isOnline ? 'bg-[var(--accent-leaf-soft)] text-[var(--accent-leaf)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}>{device.isOnline ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{device.name || device.deviceId}</span><span className="block truncate text-xs text-[var(--text-tertiary)]">{device.name ? device.deviceId : device.chipId}</span></span>
                    <span className="hidden text-right sm:block"><span className="block text-sm font-semibold text-[var(--text-primary)]">{telemetry ? `${telemetry.soilMoisture}%` : '—'}</span><span className="block text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">umidade</span></span>
                    <Badge variant={device.isOnline ? 'success' : 'neutral'}>{device.isOnline ? 'Online' : 'Offline'}</Badge><ArrowRight className="size-4 text-[var(--text-tertiary)]" />
                  </button>
                })}
              </div>
            )}
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader><div><CardTitle>Próximas rotinas</CardTitle><p className="mt-1 text-xs text-[var(--text-tertiary)]">Programações ativas no navegador</p></div><button onClick={() => navigate('/programacao')} className="rounded-lg p-2 text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)]" aria-label="Criar programação"><Plus className="size-4" /></button></CardHeader>
            {activePlans.length === 0 ? <EmptyState icon={<CalendarClock className="size-6" />} title="Agenda livre" description="Crie uma rotina para organizar as próximas irrigações." action={<button onClick={() => navigate('/programacao')} className="text-sm font-semibold text-[var(--accent-leaf)]">Criar rotina</button>} /> : (
              <div className="space-y-2">{activePlans.slice(0, 5).map((plan) => <div key={plan.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-secondary)] bg-[var(--bg-primary)]/55 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-sun-soft)] text-[var(--accent-sun)]"><Zap className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{plan.culturaNome}</span><span className="block truncate text-xs text-[var(--text-tertiary)]">{plan.zonaNome} · {plan.quantidadeAguaMl} ml</span></span>
                <span className="text-right"><span className="block text-sm font-bold text-[var(--text-primary)]">{plan.horario}</span><span className="block text-[10px] text-[var(--text-tertiary)]">{plan.diasSemana.length === 7 ? 'Todos os dias' : `${plan.diasSemana.length} dias/sem`}</span></span>
              </div>)}</div>
            )}
          </Card>
        </section>

        {devices.length > 0 && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{devices.slice(0, 4).map((device) => {
          const telemetry = telemetries.get(device.deviceId)
          const moisture = telemetry?.soilMoisture ?? null
          const width = `${moisture ?? 0}%`
          return <button key={device.id} onClick={() => navigate(`/dispositivos/${device.deviceId}`)} className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 text-left transition-all hover:border-[var(--accent-water)]/40 hover:shadow-md">
            <div className="flex items-center justify-between"><span className="truncate text-xs font-semibold text-[var(--text-secondary)]">{device.name || device.deviceId}</span>{telemetry?.pumpOn ? <Badge variant="warning">Irrigando</Badge> : <CheckCircle2 className="size-4 text-[var(--text-tertiary)]" />}</div>
            <div className="mt-5 flex items-end justify-between"><span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{moisture === null ? '—' : `${moisture}%`}</span><Droplets className="size-4 text-[var(--accent-water)]" /></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]"><div className="h-full rounded-full bg-[var(--accent-water)] transition-all duration-500" style={{ width }} /></div>
          </button>
        })}</section>}
      </div>
    </Layout>
  )
}
