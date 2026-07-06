import { useState } from 'react'
import Layout from '../components/Layout'
import { culturasStore } from '../lib/store'
import { Sprout, Plus, Pencil, Trash2, Droplets, Gauge, Clock } from 'lucide-react'
import type { Cultura } from '../lib/types'

const cores = ['#ef4444', '#22c55e', '#f97316', '#eab308', '#ec4899', '#a855f7', '#3b82f6', '#14b8a6']
const icones = ['🍅', '🥬', '🥕', '🫑', '🍓', '🌽', '🌻', '🌿', '🌶️', '🧅', '🥒', '🍆']

export default function Plants() {
  const [culturas, setCulturas] = useState(culturasStore.list())
  const [modal, setModal] = useState<Cultura | null>(null)
  const [editando, setEditando] = useState<Cultura | null>(null)

  const save = (c: Cultura) => {
    if (editando) culturasStore.update(c)
    else culturasStore.add(c)
    setCulturas(culturasStore.list())
    setEditando(null)
    setModal(null)
  }

  const remove = (id: string) => {
    culturasStore.remove(id)
    setCulturas(culturasStore.list())
  }

  const Form = ({ cultura, onSave }: { cultura: Partial<Cultura>; onSave: (c: Cultura) => void }) => {
    const [nome, setNome] = useState(cultura.nome || '')
    const [desc, setDesc] = useState(cultura.descricao || '')
    const [agua, setAgua] = useState(cultura.aguaPorRegaMl?.toString() || '')
    const [intervalo, setIntervalo] = useState(cultura.intervaloRegaHoras?.toString() || '')
    const [min, setMin] = useState(cultura.umidadeIdealMin?.toString() || '')
    const [max, setMax] = useState(cultura.umidadeIdealMax?.toString() || '')
    const [icone, setIcone] = useState(cultura.icone || icones[0])
    const [cor, setCor] = useState(cultura.cor || cores[0])

    const handle = (e: React.FormEvent) => {
      e.preventDefault()
      if (!nome.trim() || !agua || !intervalo) return
      onSave({
        id: cultura.id || crypto.randomUUID(),
        nome: nome.trim(),
        descricao: desc.trim(),
        aguaPorRegaMl: Number(agua),
        intervaloRegaHoras: Number(intervalo),
        umidadeIdealMin: Number(min) || 0,
        umidadeIdealMax: Number(max) || 100,
        icone, cor,
      })
    }

    return (
      <form onSubmit={handle} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Nome da Cultura</label>
          <input value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500" placeholder="Ex: Tomate" required />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Descrição</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500" placeholder="Opcional" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Água por Rega (ml)</label>
            <input type="number" value={agua} onChange={e => setAgua(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500" min={1} required />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Intervalo (horas)</label>
            <input type="number" value={intervalo} onChange={e => setIntervalo(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500" min={1} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Umidade Ideal Mín %</label>
            <input type="number" value={min} onChange={e => setMin(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500" min={0} max={100} />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Umidade Ideal Máx %</label>
            <input type="number" value={max} onChange={e => setMax(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white outline-none focus:border-blue-500" min={0} max={100} />
          </div>
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Ícone</label>
          <div className="flex flex-wrap gap-1">
            {icones.map(i => (
              <button key={i} type="button" onClick={() => setIcone(i)} className={`size-9 rounded-lg flex items-center justify-center text-lg transition-all ${icone === i ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-zinc-900 hover:bg-zinc-800'}`}>{i}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Cor</label>
          <div className="flex flex-wrap gap-1">
            {cores.map(c => (
              <button key={c} type="button" onClick={() => setCor(c)} className={`size-7 rounded-full transition-all ${cor === c ? 'ring-2 ring-white scale-110' : ''}`} style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 transition-colors">
          {editando ? 'Salvar' : 'Adicionar Cultura'}
        </button>
      </form>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Culturas</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Tipos de planta e suas necessidades de água</p>
          </div>
          <button onClick={() => { setEditando(null); setModal({} as Cultura) }} className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 flex items-center gap-2 text-sm transition-colors">
            <Plus className="size-4" /> Nova Cultura
          </button>
        </div>

        {culturas.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
            <Sprout className="size-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-500">Nenhuma cultura cadastrada</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {culturas.map(c => (
              <div key={c.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: `${c.cor}20` }}>{c.icone}</div>
                    <div>
                      <h3 className="font-semibold text-white">{c.nome}</h3>
                      {c.descricao && <p className="text-xs text-zinc-500">{c.descricao}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditando(c); setModal(c) }} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all"><Pencil className="size-3.5" /></button>
                    <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"><Trash2 className="size-3.5" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                    <Droplets className="size-3.5 mx-auto mb-1 text-blue-400" />
                    <div className="text-white font-medium">{c.aguaPorRegaMl}ml</div>
                    <div className="text-zinc-600">por rega</div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                    <Clock className="size-3.5 mx-auto mb-1 text-emerald-400" />
                    <div className="text-white font-medium">{c.intervaloRegaHoras}h</div>
                    <div className="text-zinc-600">intervalo</div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-lg p-2 text-center">
                    <Gauge className="size-3.5 mx-auto mb-1 text-violet-400" />
                    <div className="text-white font-medium">{c.umidadeIdealMin}-{c.umidadeIdealMax}%</div>
                    <div className="text-zinc-600">umidade</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {modal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-white mb-4">{editando ? 'Editar Cultura' : 'Nova Cultura'}</h2>
              <Form cultura={editando || {}} onSave={save} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
