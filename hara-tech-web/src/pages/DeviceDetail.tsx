import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import {
  ArrowLeft, Power, PowerOff, RotateCcw, RefreshCw,
  Zap, ZapOff, Trash2, Plus, Cpu, Droplets, Wifi
} from 'lucide-react'
import type { Zone, DeviceConfig, Command, Telemetry } from '../lib/types'

export default function DeviceDetail() {
  const { deviceId } = useParams<{ deviceId: string }>()
  const navigate = useNavigate()
  const [zones, setZones] = useState<Zone[]>([])
  const [config, setConfig] = useState<DeviceConfig | null>(null)
  const [commands, setCommands] = useState<Command[]>([])
  const [newZoneName, setNewZoneName] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)

  const fetchAll = async () => {
    if (!deviceId) return
    const [z, c, cmds, t] = await Promise.all([
      api.zonas.listar(deviceId).catch(() => ({ zones: [] })),
      api.config.obter(deviceId).catch(() => null),
      api.comandos.listar(deviceId).catch(() => ({ commands: [] })),
      api.telemetria.ultima(deviceId).catch(() => null),
    ])
    setZones(z.zones)
    setConfig(c)
    setCommands(cmds.commands)
    setTelemetry(t)
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
    fetchAll()
  }

  const deleteZone = async (zoneId: string) => {
    if (!deviceId) return
    await api.zonas.deletar(deviceId, zoneId)
    fetchAll()
  }

  const copyId = () => {
    if (deviceId) { navigator.clipboard.writeText(deviceId); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const statusBadge = (st: string) => {
    const m: Record<string, string> = { PENDING: 'bg-yellow-500/15 text-yellow-400', SENT: 'bg-blue-500/15 text-blue-400', ACKED: 'bg-green-500/15 text-green-400', FAILED: 'bg-red-500/15 text-red-400' }
    return <span className={`text-xs px-2 py-0.5 rounded-full ${m[st] || 'bg-zinc-500/15 text-zinc-400'}`}>{st}</span>
  }

  return (
    <Layout>
      <div className="max-w-4xl">
        <button onClick={() => navigate('/dispositivos')} className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft className="size-4" /> Voltar
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Cpu className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white font-mono">{deviceId}</h1>
              <button onClick={copyId} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-sm text-zinc-500">Detalhes e controle do dispositivo</p>
          </div>
          <button onClick={fetchAll} className="ml-auto text-zinc-500 hover:text-blue-400 transition-colors">
            <RefreshCw className="size-4" />
          </button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Controles Rápidos</h2>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => sendCmd('PUMP_ON')} disabled={sending !== null}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-40">
              <Power className="size-4" /> Bomba Ligar
            </button>
            <button onClick={() => sendCmd('PUMP_OFF')} disabled={sending !== null}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-40">
              <PowerOff className="size-4" /> Bomba Desligar
            </button>
            <button onClick={() => sendCmd('SYNC_CONFIG')} disabled={sending !== null}
              className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-40">
              <RotateCcw className="size-4" /> Sincronizar
            </button>
            <button onClick={() => sendCmd('RESTART')} disabled={sending !== null}
              className="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-lg px-4 py-2 text-sm transition-all disabled:opacity-40">
              <RefreshCw className="size-4" /> Reiniciar
            </button>
          </div>
        </div>

        {telemetry && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Telemetria ao Vivo</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 mb-1">
                  <Droplets className="size-3" /> Umidade do Solo
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-800 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all ${
                        telemetry.soilMoisture < (config?.moistureThreshold ?? 35)
                          ? 'bg-red-500'
                          : telemetry.soilMoisture < 70
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${telemetry.soilMoisture}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-white">{telemetry.soilMoisture}%</span>
                </div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <div className="text-xs text-zinc-600 mb-1">Bomba</div>
                <div className={`text-lg font-bold ${telemetry.pumpOn ? 'text-green-400' : 'text-zinc-500'}`}>
                  {telemetry.pumpOn ? 'Ligada' : 'Desligada'}
                </div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 mb-1">
                  <Wifi className="size-3" /> Sinal
                </div>
                <div className="text-lg font-bold text-white">{telemetry.rssi ?? '-'} dBm</div>
              </div>
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <div className="text-xs text-zinc-600 mb-1">Atualizado</div>
                <div className="text-sm font-medium text-white">{new Date(telemetry.createdAt).toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        )}

        {config && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mb-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Configuração</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Modo', value: config.operationMode },
                { label: 'Bomba', value: config.pumpMode },
                { label: 'Umidade Mín', value: `${config.moistureThreshold}%` },
                { label: 'Versão', value: `v${config.configVersion}` },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900/50 rounded-lg p-3">
                  <div className="text-xs text-zinc-600">{s.label}</div>
                  <div className="text-sm font-medium text-white mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Zonas</h2>
            <div className="flex gap-2">
              <input value={newZoneName} onChange={e => setNewZoneName(e.target.value)}
                placeholder="Nova zona" className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-blue-500 w-32"
                onKeyDown={e => e.key === 'Enter' && createZone()} />
              <button onClick={createZone} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg px-3 py-1.5 transition-all">
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          {zones.length === 0 ? (
            <p className="text-zinc-700 text-sm py-6 text-center">Nenhuma zona</p>
          ) : (
            <div className="space-y-1.5">
              {zones.map(z => (
                <div key={z.id} className="flex items-center justify-between bg-zinc-900/30 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-600">#{z.index}</span>
                    <span className="text-white text-sm">{z.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${z.isActive ? 'bg-green-500/15 text-green-400' : 'bg-zinc-500/15 text-zinc-500'}`}>
                      {z.isActive ? 'Aberta' : 'Fechada'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => sendCmd('OPEN_ZONE', { zoneIndex: z.index })}
                      className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 disabled:opacity-40 transition-all" title="Abrir">
                      <Zap className="size-4" />
                    </button>
                    <button onClick={() => sendCmd('CLOSE_ZONE', { zoneIndex: z.index })}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40 transition-all" title="Fechar">
                      <ZapOff className="size-4" />
                    </button>
                    <button onClick={() => deleteZone(z.id)}
                      className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all" title="Remover">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Comandos</h2>
          {commands.length === 0 ? (
            <p className="text-zinc-700 text-sm py-6 text-center">Nenhum comando enviado</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {commands.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-zinc-900/20 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">{c.type}</span>
                    {c.payload && <span className="text-xs text-zinc-700">{JSON.stringify(c.payload)}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(c.status)}
                    <span className="text-xs text-zinc-700">{new Date(c.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
