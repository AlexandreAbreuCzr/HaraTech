import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { culturasStore } from '../lib/store'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Modal } from '../components/ui/modal'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { Sprout, Plus, Pencil, Trash2, Droplets, Gauge, Clock, Search } from 'lucide-react'
import type { Cultura } from '../lib/types'

const cores = ['#16a34a', '#22c55e', '#f97316', '#eab308', '#ef4444', '#a855f7', '#3b82f6', '#14b8a6']
const icones = ['🍅', '🥬', '🥕', '🫑', '🍓', '🌽', '🌻', '🌿', '🌶️', '🧅', '🥒', '🍆']

export default function Plants() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [culturas, setCulturas] = useState(culturasStore.list())
  const [editando, setEditando] = useState<Cultura | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const closeModal = () => {
    setModalOpen(false)
    if (searchParams.has('new')) {
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }

  const save = (c: Cultura) => {
    if (editando) culturasStore.update(c)
    else culturasStore.add(c)
    setCulturas(culturasStore.list())
    setEditando(null)
    closeModal()
  }

  const remove = (id: string) => {
    const cultura = culturas.find((item) => item.id === id)
    if (!window.confirm(`Remover a cultura “${cultura?.nome ?? ''}”?`)) return
    culturasStore.remove(id)
    setCulturas(culturasStore.list())
  }

  const openNew = () => {
    setEditando(null)
    setModalOpen(true)
  }

  const openEdit = (c: Cultura) => {
    setEditando(c)
    setModalOpen(true)
  }

  const filtered = culturas.filter((cultura) => `${cultura.nome} ${cultura.descricao}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout>
      <PageHeader
        title="Culturas"
        description={`${culturas.length} cultura${culturas.length !== 1 ? 's' : ''} cadastrada${culturas.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={openNew} icon={<Plus />}>
            Nova Cultura
          </Button>
        }
      />

      {culturas.length > 0 && <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cultura…" className="h-10 w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
      </div>}

      {culturas.length === 0 ? (
        <EmptyState
          icon={<Sprout className="size-6" />}
          title="Nenhuma cultura cadastrada"
          description="Adicione culturas para configurar a irrigação de cada tipo de planta"
          action={<Button onClick={openNew} icon={<Plus />}>Nova Cultura</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search className="size-6" />} title="Nenhuma cultura encontrada" description="Tente buscar por outro nome ou descrição." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, idx) => (
            <Card key={c.id} className="animate-slide-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="size-12 rounded-2xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${c.cor}15` }}
                  >
                    {c.icone}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{c.nome}</h3>
                    {c.descricao && (
                      <p className="text-xs text-[var(--text-tertiary)]">{c.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
                    aria-label={`Editar ${c.nome}`}
                    title="Editar cultura"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                    aria-label={`Remover ${c.nome}`}
                    title="Remover cultura"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/40 text-center">
                  <Droplets className="size-4 mx-auto mb-1 text-blue-500" />
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{c.aguaPorRegaMl}ml</div>
                  <div className="text-xs text-[var(--text-tertiary)]">por rega</div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/40 text-center">
                  <Clock className="size-4 mx-auto mb-1 text-emerald-500" />
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{c.intervaloRegaHoras}h</div>
                  <div className="text-xs text-[var(--text-tertiary)]">intervalo</div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]/40 text-center">
                  <Gauge className="size-4 mx-auto mb-1 text-violet-500" />
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{c.umidadeIdealMin}-{c.umidadeIdealMax}%</div>
                  <div className="text-xs text-[var(--text-tertiary)]">umidade</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        open={modalOpen || searchParams.get('new') === '1'}
        onClose={closeModal}
        title={editando ? 'Editar Cultura' : 'Nova Cultura'}
      >
        <CulturaForm cultura={editando} onSave={save} />
      </Modal>
    </Layout>
  )
}

function CulturaForm({ cultura, onSave }: { cultura: Cultura | null; onSave: (c: Cultura) => void }) {
  const [nome, setNome] = useState(cultura?.nome || '')
  const [desc, setDesc] = useState(cultura?.descricao || '')
  const [agua, setAgua] = useState(cultura?.aguaPorRegaMl?.toString() || '')
  const [intervalo, setIntervalo] = useState(cultura?.intervaloRegaHoras?.toString() || '')
  const [min, setMin] = useState(cultura?.umidadeIdealMin?.toString() || '')
  const [max, setMax] = useState(cultura?.umidadeIdealMax?.toString() || '')
  const [icone, setIcone] = useState(cultura?.icone || icones[0])
  const [cor, setCor] = useState(cultura?.cor || cores[0])
  const [error, setError] = useState('')

  const handle = (e: React.FormEvent) => {
    e.preventDefault()
    const water = Number(agua)
    const interval = Number(intervalo)
    const minimum = min === '' ? 0 : Number(min)
    const maximum = max === '' ? 100 : Number(max)
    if (!nome.trim() || !Number.isFinite(water) || water <= 0 || !Number.isFinite(interval) || interval <= 0) {
      setError('Informe uma quantidade de água e um intervalo válidos.')
      return
    }
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum < 0 || maximum > 100 || minimum > maximum) {
      setError('A umidade mínima deve ser menor ou igual à máxima, entre 0% e 100%.')
      return
    }
    setError('')
    onSave({
      id: cultura?.id || crypto.randomUUID(),
      nome: nome.trim(),
      descricao: desc.trim(),
      aguaPorRegaMl: water,
      intervaloRegaHoras: interval,
      umidadeIdealMin: minimum,
      umidadeIdealMax: maximum,
      icone, cor,
    })
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <Input label="Nome da Cultura" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Tomate" required />
      <Input label="Descrição" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Opcional" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Água por Rega (ml)" type="number" value={agua} onChange={e => setAgua(e.target.value)} min={1} required />
        <Input label="Intervalo (horas)" type="number" value={intervalo} onChange={e => setIntervalo(e.target.value)} min={1} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Umidade Ideal Mín %" type="number" value={min} onChange={e => setMin(e.target.value)} min={0} max={100} />
        <Input label="Umidade Ideal Máx %" type="number" value={max} onChange={e => setMax(e.target.value)} min={0} max={100} />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Ícone</label>
        <div className="flex flex-wrap gap-1">
          {icones.map(i => (
            <button key={i} type="button" onClick={() => setIcone(i)}
              className={`size-9 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer
                ${icone === i ? 'bg-brand-600 ring-2 ring-brand-400 text-white' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)]'}`}>
              {i}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Cor</label>
        <div className="flex flex-wrap gap-2">
          {cores.map(c => (
            <button key={c} type="button" onClick={() => setCor(c)}
              className={`size-8 rounded-full transition-all cursor-pointer ${cor === c ? 'ring-2 ring-[var(--text-primary)] scale-110' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">{cultura ? 'Salvar' : 'Adicionar'}</Button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  )
}
