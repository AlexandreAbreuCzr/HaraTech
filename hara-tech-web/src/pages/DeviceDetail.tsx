import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
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
  Clock, HardDrive, Copy, Check,
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
  const [newZoneName, setNewZoneName] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [zoneModal, setZoneModal] = useState(false)

  const fetchAll = async () => {
    if (!deviceId) return
    setLoading(true)
    try {
      const [z, c, cmds, t] = await Promise.all([
        api.zonas.listar(deviceId).catch(() => ({ zones: [] as Zone[] })),
        api.config.obter(deviceId).catch(() => null),
        api.comandos.listar(deviceId).catch(() => ({ commands: [] as Command[] })),
        api.telemetria.ultima(deviceId).catch(() => null),
      ])
      setZones(z.zones)
      setConfig(c)
      setCommands(cmds.commands)
      setTelemetry(t)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [deviceId])

  const sendCmd = async (type: string, payload?: Record<string, unknown>) => {
    if (!deviceId) return
    setSending(type)
    try {
      await api.comandos.criar(deviceId, { type, payload })
      setTimeout(fetchAll, 600)
    } catch {}
    setSending(null)
  }

  const createZone = async () => {
    if (!deviceId || !newZoneName.trim()) return
    await api.zonas.criar(deviceId, { name: newZoneName.trim() })
    setNewZoneName('')
    setZoneModal(false)
    fetchAll()
  }

  const deleteZone = async (zoneId: string) => {
    if (!deviceId) return
    await api.zonas.deletar(deviceId, zoneId)
    fetchAll()
  }

  const copyId = () => {
    if (deviceId) {
      navigator.clipboard.writeText(deviceId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const moistureColor = (val: number, threshold: number) => {
    if (val < threshold) return 'bg-red-500'
    if (val < 70) return 'bg-amber-500'
    return 'bg-blue-500'
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-4xl">
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
      <div className="max-w-4xl space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate('/dispositivos')}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" /> Voltar
        </button>

        {/* Device header */}
        <div className="flex items-center gap-4 animate-fade-in">
          <div className="size-12 rounded-2xl bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
            <Cpu className="size-6 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] font-mono tracking-tight">{deviceId}</h1>
              <button
                onClick={copyId}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
                title="Copiar ID"
              >
                {copied ? <Check className="size-4 text-brand-500" /> : <Copy className="size-4" />}
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
              onClick={() => sendCmd('RESTART')}
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
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/40">
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
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/40">
                <div className="text-xs text-[var(--text-tertiary)] mb-2">Bomba</div>
                <div className={`text-xl font-bold ${telemetry.pumpOn ? 'text-amber-500' : 'text-[var(--text-tertiary)]'}`}>
                  {telemetry.pumpOn ? 'Ligada' : 'Desligada'}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/40">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] mb-2">
                  <Wifi className="size-3" /> Sinal
                </div>
                <div className="text-xl font-bold text-[var(--text-primary)]">{telemetry.rssi ?? '-'} dBm</div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/40">
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
                <div key={s.label} className="p-3 rounded-xl bg-[var(--bg-tertiary)]/40">
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
            <Button size="sm" variant="secondary" onClick={() => setZoneModal(true)} icon={<Plus />}>
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
            <div className="space-y-2">
              {zones.map(z => (
                <div
                  key={z.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-tertiary)]/40 hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-1 rounded-lg">#{z.index}</span>
                    <div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{z.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={z.isActive ? 'success' : 'neutral'}>
                          {z.isActive ? 'Aberta' : 'Fechada'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendCmd('OPEN_ZONE', { zoneIndex: z.index })}
                      disabled={sending !== null}
                      icon={<Zap />}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendCmd('CLOSE_ZONE', { zoneIndex: z.index })}
                      disabled={sending !== null}
                      icon={<ZapOff />}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteZone(z.id)}
                      icon={<Trash2 />}
                      className="hover:text-red-500"
                    />
                  </div>
                </div>
              ))}
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
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {commands.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]/30"
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
      <Modal open={zoneModal} onClose={() => setZoneModal(false)} title="Nova Zona">
        <div className="space-y-4">
          <Input
            label="Nome da Zona"
            value={newZoneName}
            onChange={e => setNewZoneName(e.target.value)}
            placeholder="Ex: Horta alface"
            onKeyDown={e => e.key === 'Enter' && createZone()}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setZoneModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={createZone} className="flex-1">
              Criar
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
