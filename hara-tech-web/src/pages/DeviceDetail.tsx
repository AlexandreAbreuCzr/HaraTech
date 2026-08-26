import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, ApiError, type ZoneMutation } from '../lib/api'
import Layout from '../components/Layout'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Modal } from '../components/ui/modal'
import {
  ArrowLeft, Power, PowerOff, RotateCcw, RefreshCw,
  Zap, ZapOff, Trash2, Plus, Cpu, Droplets, Wifi,
  Clock, HardDrive, Copy, Check, Settings,
} from 'lucide-react'
import type { Zone, DeviceConfig, Command, Telemetry } from '../lib/types'

export default function DeviceDetail() {
  const { deviceId } = useParams<{ deviceId: string }>()
  const navigate = useNavigate()
  const [zones, setZones] = useState<Zone[]>([])
  const [config, setConfig] = useState<DeviceConfig | null>(null)
  const [commands, setCommands] = useState<Command[]>([])
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [zoneModal, setZoneModal] = useState<'new' | Zone | null>(null)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    if (!deviceId) return
    setLoading(true)
    setError('')
    const [zonesResult, configResult, commandsResult, telemetryResult] = await Promise.allSettled([
      api.zonas.listar(deviceId),
      api.config.obter(deviceId),
      api.comandos.listar(deviceId),
      api.telemetria.ultima(deviceId),
    ])

    if (zonesResult.status === 'fulfilled') setZones(zonesResult.value.zones)
    if (configResult.status === 'fulfilled') setConfig(configResult.value)
    if (commandsResult.status === 'fulfilled') setCommands(commandsResult.value.commands)
    if (telemetryResult.status === 'fulfilled') setTelemetry(telemetryResult.value)

    const failure = [zonesResult, configResult, commandsResult, telemetryResult].find(
      (result) => result.status === 'rejected'
    )
    if (failure?.status === 'rejected') {
      setError(failure.reason instanceof ApiError ? failure.reason.message : 'Não foi possível atualizar todos os dados do dispositivo.')
    }
    setLoading(false)
  }, [deviceId])

  useEffect(() => {
    void fetchAll()
  }, [fetchAll])

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

  const saveZone = async (input: ZoneMutation & { name: string }) => {
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
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
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
          <Button variant="ghost" size="sm" onClick={fetchAll} icon={<RefreshCw />}>
            Atualizar
          </Button>
        </div>

        {/* Quick controls */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Controles Rápidos</CardTitle>
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
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Zonas de Irrigação</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setZoneModal('new')} icon={<Plus />}>
              Nova Zona
            </Button>
          </CardHeader>
          {zones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <HardDrive className="size-8 text-[var(--text-tertiary)] mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Nenhuma zona criada</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Crie zonas para gerenciar a irrigação</p>
            </div>
          ) : (
            <div className="border-t border-[var(--border-primary)]">
              {zones.map(z => {
                const hasActuator = Boolean(z.actuator)
                const isOpen = z.appliedState === 'OPEN' || (z.appliedState === 'UNKNOWN' && z.desiredState === 'OPEN')
                return (
                <div
                  key={z.id}
                  className="flex items-center justify-between border-b border-[var(--border-primary)] px-2 py-4 transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-1 rounded-lg">#{z.index}</span>
                    <div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{z.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={isOpen ? 'success' : 'neutral'}>
                          {isOpen ? 'Aberta' : 'Fechada'}
                        </Badge>
                        {z.actuator ? (
                          <span className="text-xs text-[var(--text-tertiary)]">GPIO {z.actuator.channel}</span>
                        ) : (
                          <span className="text-xs text-[var(--text-tertiary)]">Atuador não configurado</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendCmd('OPEN_ZONE', { zoneIndex: z.index })}
                      disabled={sending !== null || !hasActuator}
                      icon={<Zap />}
                      title={hasActuator ? 'Abrir área' : 'Configure o atuador primeiro'}
                      aria-label={`Abrir ${z.name}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendCmd('CLOSE_ZONE', { zoneIndex: z.index })}
                      disabled={sending !== null || !hasActuator}
                      icon={<ZapOff />}
                      title={hasActuator ? 'Fechar área' : 'Configure o atuador primeiro'}
                      aria-label={`Fechar ${z.name}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setZoneModal(z)}
                      icon={<Settings />}
                      title="Configurar área e atuador"
                      aria-label={`Configurar ${z.name}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteZone(z)}
                      icon={<Trash2 />}
                      className="hover:text-red-500"
                      title="Remover área"
                      aria-label={`Remover ${z.name}`}
                    />
                  </div>
                </div>
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
          onCancel={() => setZoneModal(null)}
          onSave={saveZone}
        />
      </Modal>
    </Layout>
  )
}

function ZoneForm({
  zone,
  onCancel,
  onSave,
}: {
  zone: Zone | null
  onCancel: () => void
  onSave: (input: ZoneMutation & { name: string }) => Promise<void>
}) {
  const [name, setName] = useState(zone?.name ?? '')
  const [channel, setChannel] = useState(zone?.actuator?.channel?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    const parsedChannel = channel.trim() === '' ? undefined : Number(channel)
    if (parsedChannel !== undefined && (!Number.isInteger(parsedChannel) || parsedChannel < 0 || parsedChannel > 39)) return

    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        ...(parsedChannel === undefined ? {} : { actuator: { channel: parsedChannel } }),
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
      <Input
        label="GPIO do servo"
        type="number"
        value={channel}
        onChange={(event) => setChannel(event.target.value)}
        placeholder="Ex.: 13"
        min={0}
        max={39}
      />
      <p className="text-xs leading-5 text-[var(--text-tertiary)]">
        Informe o GPIO ligado ao servo. Os exemplos de montagem usam 13 para a primeira área e 12 para a segunda.
      </p>
      <div className="flex gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button type="submit" loading={saving} className="flex-1">
          {zone ? 'Salvar' : 'Criar área'}
        </Button>
      </div>
    </form>
  )
}
