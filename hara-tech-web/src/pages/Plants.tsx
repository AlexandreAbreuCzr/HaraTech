import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { culturasStore } from '../lib/store'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Modal } from '../components/ui/modal'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { Sprout, Plus, Pencil, Trash2, Search } from 'lucide-react'
import type { Cultura } from '../lib/types'

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

      {culturas.length > 0 && <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cultura…" className="h-10 w-full rounded-lg border border-[var(--border-primary)] bg-white pl-10 pr-4 text-sm text-black outline-none placeholder:text-[var(--text-tertiary)] focus:border-black" />
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
        <div className="border-t border-[var(--border-primary)]">
          {filtered.map((c, idx) => (
            <div key={c.id} className="grid gap-4 border-b border-[var(--border-primary)] py-5 animate-slide-up sm:grid-cols-[1fr_auto] sm:items-center" style={{ animationDelay: `${idx * 30}ms` }}>
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-primary)] bg-white text-xl">{c.icone}</span>
                <div className="min-w-0"><h3 className="font-medium text-black">{c.nome}</h3>{c.descricao && <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">{c.descricao}</p>}</div>
              </div>
              <div className="flex items-center gap-5 pl-14 sm:pl-0">
                <div className="hidden gap-6 text-xs sm:flex"><span><b className="font-medium text-black">{c.aguaPorRegaMl} ml</b><span className="block text-[var(--text-tertiary)]">por rega</span></span><span><b className="font-medium text-black">{c.intervaloRegaHoras} h</b><span className="block text-[var(--text-tertiary)]">intervalo</span></span><span><b className="font-medium text-black">{c.umidadeIdealMin}–{c.umidadeIdealMax}%</b><span className="block text-[var(--text-tertiary)]">umidade</span></span></div>
                <div className="flex gap-1 border-l border-[var(--border-primary)] pl-3">
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
            </div>
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
      icone, cor: cultura?.cor || '#111111',
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
              className={`flex size-9 cursor-pointer items-center justify-center rounded-lg border text-lg transition-all ${icone === i ? 'border-black bg-black' : 'border-[var(--border-primary)] bg-white hover:border-black'}`}>
              {i}
            </button>
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
