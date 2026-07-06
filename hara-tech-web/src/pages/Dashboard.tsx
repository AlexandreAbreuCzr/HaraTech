import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { culturasStore, programacoesStore } from '../lib/store'
import Layout from '../components/Layout'
import {
  HardDrive, Sprout, CalendarClock, Droplets,
  Wifi, WifiOff, TrendingUp, Clock
} from 'lucide-react'
import type { Device } from '../lib/types'

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.dispositivos.listar()
      .then(d => setDevices(d.devices))
      .catch(() => setDevices([]))
      .finally(() => setLoading(false))
  }, [])

  const online = devices.filter(d => d.isOnline).length
  const culturas = culturasStore.list()
  const programacoes = programacoesStore.list()
  const ativas = programacoes.filter(p => p.ativo).length

  const stats = [
    { label: 'Dispositivos', valor: devices.length, icone: HardDrive, cor: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Online', valor: online, icone: Wifi, cor: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Culturas', valor: culturas.length, icone: Sprout, cor: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Regas Ativas', valor: ativas, icone: CalendarClock, cor: 'text-violet-400', bg: 'bg-violet-500/10' },
  ]

  return (
    <Layout>
      <div className="max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Visão geral do sistema de irrigação</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {stats.map(s => (
            <div key={s.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`size-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icone className={`size-4 ${s.cor}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{s.valor}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Dispositivos</h2>
            {loading ? (
              <p className="text-zinc-600 text-sm py-6 text-center">Carregando...</p>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                <HardDrive className="size-8 mx-auto mb-2 text-zinc-700" />
                <p className="text-zinc-500 text-sm">Nenhum dispositivo</p>
                <p className="text-zinc-700 text-xs mt-1">Vá em Dispositivos para vincular um</p>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.slice(0, 5).map(d => (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/dispositivos/${d.deviceId}`)}
                    className="w-full flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 rounded-lg px-3 py-2.5 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-2 rounded-full ${d.isOnline ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-zinc-600'}`} />
                      <div>
                        <span className="text-sm text-white font-mono">{d.deviceId}</span>
                        {d.name && <span className="text-zinc-500 text-xs ml-2">{d.name}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-zinc-600 flex items-center gap-1">
                      {d.isOnline ? <><Wifi className="size-3 text-green-500" /> Online</> : <><WifiOff className="size-3" /> Offline</>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Próximas Regas</h2>
            {programacoes.filter(p => p.ativo).length === 0 ? (
              <div className="text-center py-8 border border-dashed border-zinc-800 rounded-lg">
                <CalendarClock className="size-8 mx-auto mb-2 text-zinc-700" />
                <p className="text-zinc-500 text-sm">Nenhuma programação ativa</p>
                <p className="text-zinc-700 text-xs mt-1">Crie uma em Programação</p>
              </div>
            ) : (
              <div className="space-y-2">
                {programacoes.filter(p => p.ativo).slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-zinc-900/50 rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <Sprout className="size-4 text-emerald-400" />
                      <div>
                        <span className="text-sm text-white">{p.culturaNome}</span>
                        <span className="text-zinc-500 text-xs ml-2">{p.zonaNome}</span>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Clock className="size-3" /> {p.horario}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
