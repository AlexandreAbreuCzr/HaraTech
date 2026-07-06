import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { programacoesStore, culturasStore } from '../lib/store'
import { api } from '../lib/api'
import { CalendarClock, Plus, Clock, Trash2, Power, PowerOff, Sprout, HardDrive } from 'lucide-react'
import type { Programacao, Device, Cultura } from '../lib/types'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_COMPLETO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function Schedules() {
  const [programacoes, setProgramacoes] = useState(programacoesStore.list())
  const [culturas, setCulturas] = useState<Cultura[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    setCulturas(culturasStore.list())
    api.dispositivos.listar().then(d => setDevices(d.devices)).catch(() => {})
  }, [])

  const refresh = () => setProgramacoes(programacoesStore.list())

  const toggleAtivo = (p: Programacao) => {
    programacoesStore.update({ ...p, ativo: !p.ativo })
    refresh()
  }

  const remove = (id: string) => {
    programacoesStore.remove(id)
    refresh()
  }

  const diasLabels = (dias: number[]) => dias.map(d => DIAS[d]).join(', ')

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Programação</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Agende regas automáticas para cada zona</p>
          </div>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 flex items-center gap-2 text-sm transition-colors">
            <Plus className="size-4" /> Nova Programação
          </button>
        </div>

        {programacoes.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
            <CalendarClock className="size-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-500">Nenhuma programação</p>
            <p className="text-zinc-700 text-xs mt-1">Crie programações para irrigar automaticamente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {programacoes.map(p => (
              <div key={p.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`size-2.5 rounded-full ${p.ativo ? 'bg-green-500' : 'bg-zinc-600'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <Sprout className="size-4 text-emerald-400" />
                      <span className="text-white font-medium">{p.culturaNome}</span>
                      <span className="text-zinc-500 text-sm">— {p.zonaNome}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {p.horario}</span>
                      <span>{diasLabels(p.diasSemana)}</span>
                      <span>{p.quantidadeAguaMl}ml</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleAtivo(p)} className={`p-1.5 rounded-lg transition-all ${p.ativo ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-zinc-800/50 text-zinc-600 hover:text-zinc-400'}`}>
                    {p.ativo ? <Power className="size-4" /> : <PowerOff className="size-4" />}
                  </button>
                  <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg bg-zinc-800/50 hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm && <ScheduleForm devices={devices} culturas={culturas} onClose={() => setShowForm(false)} onSave={() => { refresh(); setShowForm(false) }} />}
      </div>
    </Layout>
  )
}

function ScheduleForm({ devices, culturas, onClose, onSave }: { devices: Device[]; culturas: Cultura[]; onClose: () => void; onSave: () => void }) {
  const [dispositivoId, setDispositivoId] = useState(devices[0]?.deviceId || '')
  const [zonaIndex, setZonaIndex] = useState(0)
  const [zonaNome, setZonaNome] = useState('')
  const [culturaId, setCulturaId] = useState(culturas[0]?.id || '')
  const [horario, setHorario] = useState('06:00')
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5])
  const [zones, setZones] = useState<{ index: number; name: string }[]>([])

  useEffect(() => {
    if (dispositivoId) {
      api.zonas.listar(dispositivoId).then(z => setZones(z.zones)).catch(() => {})
    }
  }, [dispositivoId])

  const cultura = culturas.find(c => c.id === culturaId)

  useEffect(() => {
    if (zones.length > 0) { setZonaIndex(zones[0].index); setZonaNome(zones[0].name) }
  }, [zones])

  const toggleDia = (d: number) => {
    setDias(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  }

  const handleSave = () => {
    if (!dispositivoId || !culturaId || dias.length === 0) return
    const qtd = cultura?.aguaPorRegaMl || 200
    programacoesStore.add({
      id: crypto.randomUUID(),
      dispositivoId, zonaIndex, zonaNome,
      culturaId, culturaNome: cultura?.nome || '',
      diasSemana: dias, horario, ativo: true,
      quantidadeAguaMl: qtd, criadoEm: new Date().toISOString(),
    })
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-white mb-4">Nova Programação</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Dispositivo</label>
            <select value={dispositivoId} onChange={e => setDispositivoId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500">
              {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.deviceId}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Zona</label>
            <select value={zonaIndex} onChange={e => { const idx = Number(e.target.value); setZonaIndex(idx); setZonaNome(zones.find(z => z.index === idx)?.name || '') }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500">
              {zones.map(z => <option key={z.index} value={z.index}>#{z.index} - {z.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Cultura</label>
            <select value={culturaId} onChange={e => setCulturaId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500">
              {culturas.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome} ({c.aguaPorRegaMl}ml a cada {c.intervaloRegaHoras}h)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Horário</label>
            <input type="time" value={horario} onChange={e => setHorario(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Dias da Semana</label>
            <div className="flex gap-1.5">
              {DIAS_COMPLETO.map((d, i) => (
                <button key={i} onClick={() => toggleDia(i)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${dias.includes(i) ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>{d.slice(0, 3)}</button>
              ))}
            </div>
          </div>
          {cultura && (
            <div className="bg-zinc-900/50 rounded-lg p-3 text-sm">
              <div className="text-zinc-400">Essa cultura receberá</div>
              <div className="text-white font-medium mt-1">{cultura.aguaPorRegaMl}ml de água {dias.length > 0 ? `às ${horario} nos dias selecionados` : ''}</div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg py-2.5 text-sm transition-colors">Cancelar</button>
            <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm transition-colors">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
