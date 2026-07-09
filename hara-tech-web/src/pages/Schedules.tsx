import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { programacoesStore, culturasStore } from '../lib/store'
import { api } from '../lib/api'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Modal } from '../components/ui/modal'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { CalendarClock, Plus, Clock, Trash2, Power, PowerOff, Sprout } from 'lucide-react'
import type { Programacao, Device, Cultura } from '../lib/types'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_COMPLETO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function Schedules() {
  const [programacoes, setProgramacoes] = useState(programacoesStore.list())
  const [showForm, setShowForm] = useState(false)

  const refresh = () => setProgramacoes(programacoesStore.list())

  const toggleAtivo = (p: Programacao) => {
    programacoesStore.update({ ...p, ativo: !p.ativo })
    refresh()
  }

  const remove = (id: string) => {
    programacoesStore.remove(id)
    refresh()
  }

  const ativas = programacoes.filter(p => p.ativo).length

  return (
    <Layout>
      <PageHeader
        title="Programação"
        description={`${programacoes.length} programação${programacoes.length !== 1 ? 'ões' : ''} · ${ativas} ativa${ativas !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => setShowForm(true)} icon={<Plus />}>
            Nova Programação
          </Button>
        }
      />

      {programacoes.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="size-6" />}
          title="Nenhuma programação"
          description="Crie programações para irrigar automaticamente suas culturas"
          action={
            <Button onClick={() => setShowForm(true)} icon={<Plus />}>
              Nova Programação
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {programacoes.map((p, idx) => (
            <Card key={p.id} className="animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`size-2.5 rounded-full ${p.ativo ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-[var(--text-tertiary)]'}`} />
                  <div className="flex items-center gap-2">
                    <Sprout className="size-4 text-brand-500" />
                    <span className="font-medium text-[var(--text-primary)]">{p.culturaNome}</span>
                    <span className="text-sm text-[var(--text-tertiary)]">— {p.zonaNome}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {p.horario}
                    </span>
                    <span>{p.diasSemana.map(d => DIAS[d]).join(', ')}</span>
                    <span>{p.quantidadeAguaMl}ml</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleAtivo(p)}
                    icon={p.ativo ? <Power /> : <PowerOff />}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(p.id)}
                    icon={<Trash2 />}
                    className="hover:text-red-500"
                  />
                </div>
              </div>
              {/* Mobile details */}
              <div className="sm:hidden flex items-center gap-3 text-xs text-[var(--text-tertiary)] mt-3 pt-3 border-t border-[var(--border-primary)]">
                <span className="flex items-center gap-1"><Clock className="size-3" /> {p.horario}</span>
                <span>{p.diasSemana.map(d => DIAS[d]).join(', ')}</span>
                <span>{p.quantidadeAguaMl}ml</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && <ScheduleForm onClose={() => setShowForm(false)} onSave={() => { refresh(); setShowForm(false) }} />}
    </Layout>
  )
}

function ScheduleForm({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [devices, setDevices] = useState<Device[]>([])
  const [culturas, setCulturas] = useState<Cultura[]>([])
  const [dispositivoId, setDispositivoId] = useState('')
  const [zonaIndex, setZonaIndex] = useState(0)
  const [zonaNome, setZonaNome] = useState('')
  const [culturaId, setCulturaId] = useState('')
  const [horario, setHorario] = useState('06:00')
  const [dias, setDias] = useState<number[]>([1, 2, 3, 4, 5])
  const [zones, setZones] = useState<{ index: number; name: string }[]>([])

  useEffect(() => {
    setCulturas(culturasStore.list())
    api.dispositivos.listar().then(d => {
      setDevices(d.devices)
      if (d.devices.length > 0) setDispositivoId(d.devices[0].deviceId)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (dispositivoId) {
      api.zonas.listar(dispositivoId).then(z => {
        setZones(z.zones)
        if (z.zones.length > 0) {
          setZonaIndex(z.zones[0].index)
          setZonaNome(z.zones[0].name)
        }
      }).catch(() => {})
    }
  }, [dispositivoId])

  const cultura = culturas.find(c => c.id === culturaId)
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
    <Modal open={true} onClose={onClose} title="Nova Programação">
      <div className="space-y-4">
        <Select label="Dispositivo" value={dispositivoId} onChange={e => setDispositivoId(e.target.value)}>
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>{d.deviceId}</option>
          ))}
        </Select>

        <Select label="Zona" value={zonaIndex} onChange={e => {
          const idx = Number(e.target.value)
          setZonaIndex(idx)
          setZonaNome(zones.find(z => z.index === idx)?.name || '')
        }}>
          {zones.map(z => (
            <option key={z.index} value={z.index}>#{z.index} - {z.name}</option>
          ))}
        </Select>

        <Select label="Cultura" value={culturaId} onChange={e => setCulturaId(e.target.value)}>
          {culturas.map(c => (
            <option key={c.id} value={c.id}>{c.icone} {c.nome} ({c.aguaPorRegaMl}ml)</option>
          ))}
        </Select>

        <Input label="Horário" type="time" value={horario} onChange={e => setHorario(e.target.value)} />

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Dias da Semana</label>
          <div className="flex gap-1.5">
            {DIAS_COMPLETO.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDia(i)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer
                  ${dias.includes(i)
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:bg-[var(--border-primary)]'
                  }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {cultura && (
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/40 space-y-1">
            <p className="text-xs text-[var(--text-tertiary)]">Essa cultura receberá</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {cultura.aguaPorRegaMl}ml de água {dias.length > 0 ? `às ${horario}` : ''}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} className="flex-1">Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}
