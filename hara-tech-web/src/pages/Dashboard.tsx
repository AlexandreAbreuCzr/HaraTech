import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { culturasStore, programacoesStore } from '../lib/store'
import Layout from '../components/Layout'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { ArrowRight, Plus, RefreshCw } from 'lucide-react'
import type { Device, Telemetry } from '../lib/types'

const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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
      setError(err instanceof ApiError ? err.message : 'Não foi possível atualizar os dados.')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const online = devices.filter((device) => device.isOnline).length
  const culturas = culturasStore.list()
  const programacoes = programacoesStore.list()
  const activePlans = programacoes.filter((plan) => plan.ativo)
  const areaMoistureReadings = Array.from(telemetries.values()).flatMap((telemetry) =>
    telemetry.zones.flatMap((zone) => zone.soilMoisture === null ? [] : [zone.soilMoisture])
  )
  const avgMoisture = areaMoistureReadings.length
    ? Math.round(areaMoistureReadings.reduce((sum, reading) => sum + reading, 0) / areaMoistureReadings.length)
    : null

  if (loading) return <Layout><div className="space-y-8"><Skeleton className="h-10 w-52" /><Skeleton className="h-24 w-full" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div></div></Layout>

  const metrics = [
    { label: 'Dispositivos online', value: `${online} / ${devices.length}`, detail: devices.length ? `${devices.length - online} offline` : 'Nenhum vinculado' },
    { label: 'Média das áreas', value: avgMoisture === null ? '—' : `${avgMoisture}%`, detail: areaMoistureReadings.length ? `${areaMoistureReadings.length} área${areaMoistureReadings.length === 1 ? '' : 's'} com leitura` : 'Sem leitura por área' },
    { label: 'Culturas', value: culturas.length, detail: 'perfis cadastrados' },
    { label: 'Programações', value: activePlans.length, detail: `${programacoes.length} no total` },
  ]

  return (
    <Layout>
      <div className="space-y-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-3xl font-semibold tracking-[-0.04em] text-black">Visão geral</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Estado atual do sistema de irrigação.</p></div>
          <div className="flex items-center gap-3">{updatedAt && <span className="text-xs text-[var(--text-tertiary)]">{updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}<Button variant="secondary" size="sm" onClick={() => void load(true)} loading={refreshing} icon={<RefreshCw />}>Atualizar</Button></div>
        </header>

        {error && <p role="alert" className="border-l-2 border-black pl-3 text-sm text-black">{error}</p>}

        <section className="grid border-y border-[var(--border-primary)] sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => <div key={metric.label} className={`py-5 sm:px-5 ${index > 0 ? 'border-t sm:border-t-0 sm:border-l' : ''} ${index === 2 ? 'sm:border-t xl:border-t-0' : ''}`}><p className="text-xs text-[var(--text-secondary)]">{metric.label}</p><p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-black">{metric.value}</p><p className="mt-1 text-xs text-[var(--text-tertiary)]">{metric.detail}</p></div>)}
        </section>

        {(devices.length === 0 || online < devices.length) && <section className="flex flex-col justify-between gap-5 border border-[var(--border-primary)] bg-white p-5 sm:flex-row sm:items-center">
          <div><h2 className="text-sm font-semibold text-black">{devices.length === 0 ? 'Nenhum dispositivo vinculado' : 'Há dispositivos offline'}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{devices.length === 0 ? 'Vincule um controlador para começar a receber leituras.' : 'Abra a lista para conferir a última conexão.'}</p></div>
          <Button size="sm" onClick={() => navigate('/dispositivos')} icon={devices.length === 0 ? <Plus /> : <ArrowRight />}>{devices.length === 0 ? 'Vincular dispositivo' : 'Ver dispositivos'}</Button>
        </section>}

        <div className="grid gap-10 xl:grid-cols-5">
          <section className="xl:col-span-3">
            <div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-semibold text-black">Dispositivos</h2><p className="mt-1 text-xs text-[var(--text-tertiary)]">Leitura mais recente</p></div>{devices.length > 0 && <button onClick={() => navigate('/dispositivos')} className="text-xs font-semibold text-black underline underline-offset-4">Ver todos</button>}</div>
            <div className="border-t border-[var(--border-primary)]">
              {devices.length === 0 ? <p className="py-10 text-sm text-[var(--text-tertiary)]">Nenhum dispositivo para exibir.</p> : devices.slice(0, 6).map((device) => {
                const telemetry = telemetries.get(device.deviceId)
                const readings = telemetry?.zones.flatMap((zone) => zone.soilMoisture === null ? [] : [zone.soilMoisture]) ?? []
                const deviceAreaAverage = readings.length
                  ? Math.round(readings.reduce((sum, reading) => sum + reading, 0) / readings.length)
                  : null
                return <button key={device.id} onClick={() => navigate(`/dispositivos/${device.deviceId}`)} className="grid w-full grid-cols-[1fr_auto] items-center gap-4 border-b border-[var(--border-primary)] py-4 text-left hover:bg-[#f5f5f5] sm:grid-cols-[1fr_100px_90px_auto] sm:px-2">
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-black">{device.name || device.deviceId}</span><span className="mt-0.5 block truncate text-xs text-[var(--text-tertiary)]">{device.deviceId}</span></span>
                  <span className="hidden text-sm text-black sm:block">{deviceAreaAverage === null ? '—' : `${deviceAreaAverage}%`}</span>
                  <span className={`hidden text-xs sm:block ${device.isOnline ? 'text-black' : 'text-[var(--text-tertiary)]'}`}>{device.isOnline ? 'Online' : 'Offline'}</span>
                  <ArrowRight className="size-4 text-[var(--text-tertiary)]" />
                </button>
              })}
            </div>
          </section>

          <section className="xl:col-span-2">
            <div className="mb-4 flex items-end justify-between"><div><h2 className="text-base font-semibold text-black">Programação</h2><p className="mt-1 text-xs text-[var(--text-tertiary)]">Rotinas ativas</p></div><button onClick={() => navigate('/programacao?new=1')} className="text-xs font-semibold text-black underline underline-offset-4">Adicionar</button></div>
            <div className="border-t border-[var(--border-primary)]">
              {activePlans.length === 0 ? <p className="py-10 text-sm text-[var(--text-tertiary)]">Nenhuma programação ativa.</p> : activePlans.slice(0, 6).map((plan) => <div key={plan.id} className="grid grid-cols-[1fr_auto] gap-4 border-b border-[var(--border-primary)] py-4">
                <div><p className="text-sm font-medium text-black">{plan.culturaNome}</p><p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{plan.zonaNome} · {plan.diasSemana.map((day) => days[day]).join(', ')}</p></div><div className="text-right"><p className="text-sm font-medium text-black">{plan.horario}</p><p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{plan.quantidadeAguaMl} ml</p></div>
              </div>)}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}
