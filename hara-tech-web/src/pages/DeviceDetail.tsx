import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, ApiError, type ZoneMutation } from '../lib/api'
import Layout from '../components/Layout'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Skeleton } from '../components/ui/skeleton'
import { Modal } from '../components/ui/modal'
import {
  ArrowLeft, Power, PowerOff, RotateCcw, RefreshCw,
  Trash2, Plus, Cpu, Droplets, Wifi,
  Clock, HardDrive, Copy, Check, Settings, Play, Square,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import type { Zone, DeviceConfig, Command, Telemetry, IrrigationLog } from '../lib/types'

const HARA_PORTS = [
  { number: 1, zoneIndex: 0, servoGpio: 13, sensorGpio: 34 },
  { number: 2, zoneIndex: 1, servoGpio: 14, sensorGpio: 35 },
  { number: 3, zoneIndex: 2, servoGpio: 25, sensorGpio: 36 },
] as const

export default function DeviceDetail() {
  const { deviceId } = useParams<{ deviceId: string }>()
  const navigate = useNavigate()
  const [zones, setZones] = useState<Zone[]>([])
  const [config, setConfig] = useState<DeviceConfig | null>(null)
  const [commands, setCommands] = useState<Command[]>([])
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [irrigationLogs, setIrrigationLogs] = useState<IrrigationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [zoneModal, setZoneModal] = useState<'new' | Zone | null>(null)
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState('')
  const [clock, setClock] = useState(() => Date.now())
  const [error, setError] = useState('')

  const fetchAll = useCallback(async (showLoading = true) => {
    if (!deviceId) return
    if (showLoading) setLoading(true)
    setError('')
    const [zonesResult, configResult, commandsResult, telemetryResult, logsResult] = await Promise.allSettled([
      api.zonas.listar(deviceId),
      api.config.obter(deviceId),
      api.comandos.listar(deviceId),
      api.telemetria.ultima(deviceId),
      api.irrigacao.listarDispositivo(deviceId),
    ])

    if (zonesResult.status === 'fulfilled') setZones(zonesResult.value.zones)
    if (configResult.status === 'fulfilled') setConfig(configResult.value)
    if (commandsResult.status === 'fulfilled') setCommands(commandsResult.value.commands)
    if (telemetryResult.status === 'fulfilled') setTelemetry(telemetryResult.value)
    if (logsResult.status === 'fulfilled') setIrrigationLogs(logsResult.value.logs)

    const failure = [zonesResult, configResult, commandsResult, telemetryResult, logsResult].find(
      (result) => result.status === 'rejected'
    )
    if (failure?.status === 'rejected') {
      setError(failure.reason instanceof ApiError ? failure.reason.message : 'Não foi possível atualizar todos os dados do dispositivo.')
    }
    if (showLoading) setLoading(false)
  }, [deviceId])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

  useEffect(() => {
    const refresh = window.setInterval(() => void fetchAll(false), 3_000)
    return () => window.clearInterval(refresh)
  }, [fetchAll])

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const sendCmd = async (type: string, payload?: Record<string, unknown>) => {
    if (!deviceId) return
    setError('')
    setSending(type)
    try {
      await api.comandos.criar(deviceId, { type, payload })
      await fetchAll()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar o comando.')
    } finally {
      setSending(null)
    }
  }

  const controlZone = async (zone: Zone, start: boolean) => {
    if (!deviceId) return
    const actionKey = `${start ? 'start' : 'stop'}-${zone.id}`
    setSending(actionKey)
    setError('')
    setNotice('')

    try {
      if (start) {
        await api.comandos.criar(deviceId, { type: 'OPEN_ZONE', payload: { zoneIndex: zone.index } })
        await api.comandos.criar(deviceId, { type: 'PUMP_ON' })
        setNotice(`Comando enviado. A rega de “${zone.name}” começará após a confirmação do dispositivo.`)
      } else {
        const anotherZoneIsWatering = zones.some((candidate) => {
          if (candidate.id === zone.id) return false
          const hasActiveLog = irrigationLogs.some((log) => log.zone?.index === candidate.index && !log.endedAt)
          return hasActiveLog || candidate.appliedState === 'OPEN'
        })

        if (!anotherZoneIsWatering) {
          await api.comandos.criar(deviceId, { type: 'PUMP_OFF' })
        }
        await api.comandos.criar(deviceId, { type: 'CLOSE_ZONE', payload: { zoneIndex: zone.index } })
        setNotice(`Comando enviado. A rega de “${zone.name}” será encerrada pelo dispositivo.`)
      }
      await fetchAll(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível controlar esta área.')
    } finally {
      setSending(null)
    }
  }

  const toggleZoneDetails = (zoneId: string) => {
    setExpandedZones((current) => {
      const next = new Set(current)
      if (next.has(zoneId)) next.delete(zoneId)
      else next.add(zoneId)
      return next
    })
  }

  const saveZone = async (input: ZoneMutation & Required<Pick<ZoneMutation, 'name' | 'index' | 'actuator'>>) => {
    if (!deviceId) return
    setError('')
    try {
      if (zoneModal === 'new') {
        await api.zonas.criar(deviceId, input)
      } else if (zoneModal) {
        await api.zonas.atualizar(deviceId, zoneModal.id, input)
      }
      setZoneModal(null)
      await fetchAll()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a área.')
    }
  }

  const deleteZone = async (zone: Zone) => {
    if (!deviceId || !window.confirm(`Remover a área “${zone.name}”? Esta ação não pode ser desfeita.`)) return
    setError('')
    try {
      await api.zonas.deletar(deviceId, zone.id)
      await fetchAll()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover a área.')
    }
  }

  const copyId = async () => {
    if (!deviceId) return
    try {
      await navigator.clipboard.writeText(deviceId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Não foi possível copiar o identificador do dispositivo.')
    }
  }

  const moistureColor = (val: number, threshold: number) => {
    if (val < threshold) return 'bg-[#8a8a8a]'
    return 'bg-black'
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl space-y-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl space-y-6">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-xl border border-[var(--border-primary)] bg-white px-4 py-3 text-sm text-black">
            {notice}
          </div>
        )}
        {/* Back button */}
        <button
          onClick={() => navigate('/dispositivos')}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>

        {/* Device header */}
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="flex size-11 items-center justify-center rounded-lg border border-[var(--border-primary)] bg-white">
            <Cpu className="size-5 text-black" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] font-mono tracking-tight">{deviceId}</h1>
              <button
                onClick={copyId}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
              title="Copiar ID"
              aria-label="Copiar ID do dispositivo"
              >
                {copied ? <Check className="size-4 text-black" /> : <Copy className="size-4" />}
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">Detalhes e controle do dispositivo</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void fetchAll()} icon={<RefreshCw />}>
            Atualizar
          </Button>
        </div>

        {/* Quick controls */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Controle do sistema</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => sendCmd('PUMP_ON')}
              disabled={sending !== null}
              icon={<Power />}
            >
              Bomba Ligar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => sendCmd('PUMP_OFF')}
              disabled={sending !== null}
              icon={<PowerOff />}
            >
              Bomba Desligar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => sendCmd('SYNC_CONFIG')}
              disabled={sending !== null}
              icon={<RotateCcw />}
            >
              Sincronizar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { if (window.confirm('Reiniciar este dispositivo agora?')) void sendCmd('RESTART') }}
              disabled={sending !== null}
              icon={<RefreshCw />}
            >
              Reiniciar
            </Button>
          </div>
        </Card>

        {/* Telemetry */}
        {telemetry && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Telemetria</CardTitle>
              <Badge variant={telemetry.pumpOn ? 'warning' : 'neutral'}>
                {telemetry.pumpOn ? 'Bomba ligada' : 'Bomba desligada'}
              </Badge>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="border-l border-[var(--border-primary)] pl-4 first:border-l-0 first:pl-0">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-2">
                  <Droplets className="size-3" /> Umidade
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${moistureColor(telemetry.soilMoisture, config?.moistureThreshold ?? 35)}`}
                      style={{ width: `${telemetry.soilMoisture}%` }}
                    />
                  </div>
                  <span className="text-xl font-bold text-[var(--text-primary)]">{telemetry.soilMoisture}%</span>
                </div>
              </div>
              <div className="border-l border-[var(--border-primary)] pl-4 first:border-l-0 first:pl-0">
                <div className="text-xs text-[var(--text-tertiary)] mb-2">Bomba</div>
                <div className={`text-xl font-semibold ${telemetry.pumpOn ? 'text-black' : 'text-[var(--text-tertiary)]'}`}>
                  {telemetry.pumpOn ? 'Ligada' : 'Desligada'}
                </div>
              </div>
              <div className="border-l border-[var(--border-primary)] pl-4 first:border-l-0 first:pl-0">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-2">
                  <Wifi className="size-3" /> Sinal
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">{telemetry.rssi ?? '-'} dBm</div>
              </div>
              <div className="border-l border-[var(--border-primary)] pl-4 first:border-l-0 first:pl-0">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-2">
                  <Clock className="size-3" /> Atualizado
                </div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {new Date(telemetry.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Config */}
        {config && (
          <Card className="animate-slide-up">
            <CardHeader>
              <CardTitle>Configuração</CardTitle>
              <Badge>v{config.configVersion}</Badge>
            </CardHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Modo', value: config.operationMode },
                { label: 'Bomba', value: config.pumpMode },
                { label: 'Umidade Mín', value: `${config.moistureThreshold}%` },
                { label: 'Versão', value: `v${config.configVersion}` },
              ].map(s => (
                <div key={s.label} className="border-l border-[var(--border-primary)] pl-3 first:border-l-0 first:pl-0">
                  <div className="text-xs text-[var(--text-tertiary)]">{s.label}</div>
                  <div className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Zones */}
        <Card padding={false} className="animate-slide-up overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Rega por área</CardTitle>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">Acompanhe cada local e regue manualmente quando precisar.</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setZoneModal('new')}
              icon={<Plus />}
              disabled={zones.length >= HARA_PORTS.length}
              title={zones.length >= HARA_PORTS.length ? 'As três saídas já estão configuradas' : undefined}
            >
              Nova área
            </Button>
          </div>
          {zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <HardDrive className="size-8 text-[var(--text-tertiary)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Nenhuma área criada</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Crie uma área para acompanhar e controlar a rega.</p>
            </div>
          ) : (
            <div className="border-t border-[var(--border-primary)]">
              {zones.map(z => {
                const hasActuator = Boolean(z.actuator)
                const isOpen = z.appliedState === 'OPEN' || (z.appliedState === 'UNKNOWN' && z.desiredState === 'OPEN')
                const zoneLogs = irrigationLogs.filter((log) => log.zone?.index === z.index)
                const activeLog = zoneLogs.find((log) => !log.endedAt)
                const stats = getZoneStats(zoneLogs, clock)
                const zoneTelemetry = telemetry?.zones.find((item) => item.zoneIndex === z.index)
                const isWatering = Boolean(activeLog) || (isOpen && Boolean(telemetry?.pumpOn))
                const hasPendingCommand = commands.some((command) =>
                  (command.status === 'PENDING' || command.status === 'SENT') &&
                  (command.type === 'OPEN_ZONE' || command.type === 'CLOSE_ZONE') &&
                  command.payload?.zoneIndex === z.index
                )
                const actionKey = `${isWatering ? 'stop' : 'start'}-${z.id}`
                const expanded = expandedZones.has(z.id)
                const stateLabel = isWatering
                  ? 'Regando agora'
                  : hasPendingCommand
                    ? 'Aguardando dispositivo'
                    : isOpen
                      ? 'Área aberta'
                      : 'Parada'
                return (
                  <article key={z.id} className="border-b border-[var(--border-primary)] p-5 last:border-b-0">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-[var(--text-tertiary)]">Saída {z.index + 1}</span>
                          <Badge variant={isWatering ? 'success' : hasPendingCommand ? 'warning' : 'neutral'}>{stateLabel}</Badge>
                        </div>
                        <h3 className="mt-2 truncate text-lg font-semibold tracking-[-0.02em] text-black">{z.name}</h3>
                        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                          {activeLog
                            ? `Iniciada ${formatRelativeTime(activeLog.startedAt, clock)} · confirmada pelo dispositivo`
                            : stats.lastLog
                              ? `Última rega em ${formatDateTime(stats.lastLog.startedAt)}`
                              : 'Ainda não há regas confirmadas nesta área'}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant={isWatering ? 'secondary' : 'primary'}
                          onClick={() => void controlZone(z, !isWatering)}
                          loading={sending === actionKey}
                          disabled={sending !== null || !hasActuator || !z.enabled || hasPendingCommand}
                          icon={isWatering ? <Square /> : <Play />}
                          title={!hasActuator ? 'Configure o atuador primeiro' : undefined}
                        >
                          {isWatering ? 'Parar rega' : 'Iniciar rega'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setZoneModal(z)} icon={<Settings />} title="Configurar área" aria-label={`Configurar ${z.name}`} />
                        <Button size="sm" variant="ghost" onClick={() => void deleteZone(z)} icon={<Trash2 />} className="hover:text-red-500" title="Remover área" aria-label={`Remover ${z.name}`} />
                      </div>
                    </div>

                    {!hasActuator && (
                      <button onClick={() => setZoneModal(z)} className="mt-4 text-left text-xs font-medium text-black underline underline-offset-4">
                        Configure uma saída física para liberar a rega manual
                      </button>
                    )}

                    <div className="mt-5 grid grid-cols-2 border-y border-[var(--border-primary)] py-4 sm:grid-cols-4">
                      <ZoneMetric label="Agora" value={activeLog ? formatDuration(getLogDuration(activeLog, clock)) : '—'} detail={activeLog ? 'em andamento' : 'sem rega ativa'} />
                      <ZoneMetric label="Hoje" value={formatDuration(stats.todaySeconds)} detail={`${stats.todayCount} rega${stats.todayCount === 1 ? '' : 's'}`} />
                      <ZoneMetric label="Últimos 7 dias" value={formatDuration(stats.weekSeconds)} detail={`${stats.weekCount} rega${stats.weekCount === 1 ? '' : 's'}`} />
                      <ZoneMetric label="Média" value={stats.averageSeconds === null ? '—' : formatDuration(stats.averageSeconds)} detail="por rega concluída" />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>Válvula: {z.confirmedState === 'UNAVAILABLE' ? z.appliedState : z.confirmedState}</span>
                        <span>Conector: Saída {z.index + 1}</span>
                        <span>Umidade: {zoneTelemetry?.soilMoisture == null ? '—' : `${zoneTelemetry.soilMoisture}%`}</span>
                        <span>Ângulo: {z.lastAppliedAngle === null ? '—' : `${z.lastAppliedAngle}°`}</span>
                      </div>
                      <button onClick={() => toggleZoneDetails(z.id)} className="inline-flex items-center gap-1 font-medium text-black">
                        {expanded ? 'Ocultar eventos' : `Ver eventos (${zoneLogs.length})`}
                        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </button>
                    </div>

                    {expanded && (
                      <div className="mt-4 border-t border-[var(--border-primary)] pt-2">
                        {zoneLogs.length === 0 ? (
                          <p className="py-3 text-xs text-[var(--text-tertiary)]">Nenhum evento confirmado pelo dispositivo.</p>
                        ) : zoneLogs.slice(0, 5).map((log) => (
                          <div key={log.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--border-primary)] py-3 text-xs last:border-b-0 sm:grid-cols-[1fr_120px_110px]">
                            <span className="text-black">{formatDateTime(log.startedAt)}</span>
                            <span className="hidden text-[var(--text-tertiary)] sm:block">{triggerLabel(log.triggeredBy)}</span>
                            <span className="text-right font-medium text-black">{log.endedAt ? formatDuration(log.durationSeconds ?? 0) : 'Em andamento'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </Card>

        {/* Commands */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Comandos</CardTitle>
            {commands.length > 0 && <Badge variant="neutral">{commands.length} total</Badge>}
          </CardHeader>
          {commands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="size-8 text-[var(--text-tertiary)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Nenhum comando enviado</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto border-t border-[var(--border-primary)]">
              {commands.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border-b border-[var(--border-primary)] px-2 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-[var(--text-primary)]">{c.type}</span>
                    {c.payload && (
                      <span className="text-xs text-[var(--text-tertiary)]">{JSON.stringify(c.payload)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      c.status === 'ACKED' ? 'success' :
                      c.status === 'FAILED' ? 'danger' :
                      c.status === 'SENT' ? 'info' : 'warning'
                    }>
                      {c.status}
                    </Badge>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {new Date(c.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* New zone modal */}
      <Modal open={zoneModal !== null} onClose={() => setZoneModal(null)} title={zoneModal === 'new' ? 'Nova Área' : 'Configurar Área'}>
        <ZoneForm
          key={zoneModal === 'new' ? 'new' : zoneModal?.id}
          zone={zoneModal === 'new' ? null : zoneModal}
          occupiedPortIndexes={zones
            .filter((candidate) => candidate.id !== (zoneModal === 'new' ? undefined : zoneModal?.id))
            .map((candidate) => candidate.index)}
          onCancel={() => setZoneModal(null)}
          onSave={saveZone}
        />
      </Modal>
    </Layout>
  )
}

function ZoneMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-l border-[var(--border-primary)] px-3 first:border-l-0 first:pl-0 even:border-l sm:even:border-l sm:first:pl-0">
      <p className="text-[11px] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-1 text-base font-semibold text-black">{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{detail}</p>
    </div>
  )
}

function getLogDuration(log: IrrigationLog, now: number) {
  if (log.durationSeconds !== null) return log.durationSeconds
  return Math.max(0, Math.floor((now - new Date(log.startedAt).getTime()) / 1_000))
}

function getZoneStats(logs: IrrigationLog[], now: number) {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const weekStart = now - 7 * 24 * 60 * 60 * 1_000
  const todayLogs = logs.filter((log) => new Date(log.startedAt).getTime() >= startOfToday.getTime())
  const weekLogs = logs.filter((log) => new Date(log.startedAt).getTime() >= weekStart)
  const completedLogs = logs.filter((log) => log.durationSeconds !== null)
  const completedSeconds = completedLogs.reduce((total, log) => total + (log.durationSeconds ?? 0), 0)

  return {
    lastLog: logs[0] ?? null,
    todaySeconds: todayLogs.reduce((total, log) => total + getLogDuration(log, now), 0),
    todayCount: todayLogs.length,
    weekSeconds: weekLogs.reduce((total, log) => total + getLogDuration(log, now), 0),
    weekCount: weekLogs.length,
    averageSeconds: completedLogs.length ? Math.round(completedSeconds / completedLogs.length) : null,
  }
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  const hours = Math.floor(seconds / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (!hours) return `${minutes}min`
  return minutes ? `${hours}h ${minutes}min` : `${hours}h`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(value: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1_000))
  if (seconds < 60) return `há ${seconds}s`
  if (seconds < 3_600) return `há ${Math.floor(seconds / 60)}min`
  return `há ${Math.floor(seconds / 3_600)}h`
}

function triggerLabel(trigger: IrrigationLog['triggeredBy']) {
  return {
    MANUAL: 'Manual',
    SCHEDULED: 'Programada',
    SENSOR: 'Sensor',
    AUTOMATION: 'Automação',
  }[trigger]
}

function ZoneForm({
  zone,
  occupiedPortIndexes,
  onCancel,
  onSave,
}: {
  zone: Zone | null
  occupiedPortIndexes: number[]
  onCancel: () => void
  onSave: (input: ZoneMutation & Required<Pick<ZoneMutation, 'name' | 'index' | 'actuator'>>) => Promise<void>
}) {
  const suggestedPort = HARA_PORTS.find((port) => !occupiedPortIndexes.includes(port.zoneIndex))
  const [name, setName] = useState(zone?.name ?? '')
  const [portIndex, setPortIndex] = useState(
    zone?.index?.toString() ?? suggestedPort?.zoneIndex.toString() ?? ''
  )
  const [openAngle, setOpenAngle] = useState(zone?.actuator?.openAngle?.toString() ?? '90')
  const [closedAngle, setClosedAngle] = useState(zone?.actuator?.closedAngle?.toString() ?? '10')
  const [inverted, setInverted] = useState(zone?.actuator?.inverted ?? false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!name.trim()) {
      setFormError('Informe o nome da área.')
      return
    }

    const selectedPort = HARA_PORTS.find((port) => port.zoneIndex === Number(portIndex))
    const parsedOpenAngle = Number(openAngle)
    const parsedClosedAngle = Number(closedAngle)
    if (!selectedPort) {
      setFormError('Selecione a saída 1, 2 ou 3 da caixa.')
      return
    }
    if (occupiedPortIndexes.includes(selectedPort.zoneIndex)) {
      setFormError('Esta saída já está sendo usada por outra área.')
      return
    }
    if (
      !Number.isInteger(parsedOpenAngle) || parsedOpenAngle < 0 || parsedOpenAngle > 180 ||
      !Number.isInteger(parsedClosedAngle) || parsedClosedAngle < 0 || parsedClosedAngle > 180 ||
      parsedOpenAngle === parsedClosedAngle
    ) {
      setFormError('Use ângulos inteiros entre 0° e 180°, com abertura e fechamento diferentes.')
      return
    }

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        index: selectedPort.zoneIndex,
        actuator: {
          channel: selectedPort.servoGpio,
          openAngle: parsedOpenAngle,
          closedAngle: parsedClosedAngle,
          inverted,
        },
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nome da área"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Ex.: Horta de alface"
        required
      />
      <Select
        label="Saída da caixa"
        value={portIndex}
        onChange={(event) => setPortIndex(event.target.value)}
        required
      >
        <option value="" disabled>Selecione a saída</option>
        {HARA_PORTS.map((port) => (
          <option key={port.number} value={port.zoneIndex} disabled={occupiedPortIndexes.includes(port.zoneIndex)}>
            Saída {port.number} — sensor + servo{occupiedPortIndexes.includes(port.zoneIndex) ? ' (em uso)' : ''}
          </option>
        ))}
      </Select>
      <p className="text-xs leading-5 text-[var(--text-tertiary)]">
        Escolha o mesmo número gravado na caixa. A alimentação e os sinais do sensor e do servo já são definidos internamente.
      </p>
      {portIndex !== '' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ângulo aberto"
              type="number"
              value={openAngle}
              onChange={(event) => setOpenAngle(event.target.value)}
              min={0}
              max={180}
            />
            <Input
              label="Ângulo fechado"
              type="number"
              value={closedAngle}
              onChange={(event) => setClosedAngle(event.target.value)}
              min={0}
              max={180}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={inverted}
              onChange={(event) => setInverted(event.target.checked)}
              className="size-4 rounded border-[var(--border-primary)]"
            />
            Inverter o sentido do servo
          </label>
          <p className="text-xs leading-5 text-[var(--text-tertiary)]">
            O firmware percorre os ângulos suavemente, a 1° a cada 20 ms. Ajuste os limites sem forçar a mangueira ou o braço do servo.
          </p>
        </>
      )}
      {formError && <p className="text-xs text-red-500">{formError}</p>}
      <div className="flex gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" loading={saving} className="flex-1">
          {zone ? 'Salvar' : 'Criar área'}
        </Button>
      </div>
    </form>
  )
}
