import { useState } from 'react'
import Layout from '../components/Layout'
import { historicoStore } from '../lib/store'
import { History as HistoryIcon, Droplets, Filter, CheckCircle2, XCircle, Timer } from 'lucide-react'
import type { RegaEvento } from '../lib/types'

export default function History() {
  const [eventos] = useState(historicoStore.list())
  const [filtro, setFiltro] = useState<string>('todos')

  const statusIcon = (st: string) => {
    if (st === 'executado') return <CheckCircle2 className="size-4 text-green-400" />
    if (st === 'falhou') return <XCircle className="size-4 text-red-400" />
    return <Timer className="size-4 text-yellow-400" />
  }

  const filtered = filtro === 'todos' ? eventos : eventos.filter(e => e.status === filtro)

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Histórico</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Registro de todas as regas executadas</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {['todos', 'executado', 'falhou', 'cancelado'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtro === f ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}>
              {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl">
            <HistoryIcon className="size-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-500">Nenhum evento registrado</p>
            <p className="text-zinc-700 text-xs mt-1">Os registros aparecerão após as irrigações</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(e => (
              <div key={e.id} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(e.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{e.culturaNome}</span>
                      <span className="text-zinc-500 text-xs">— {e.zonaNome}</span>
                    </div>
                    <div className="text-xs text-zinc-600 mt-0.5">{new Date(e.data).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-blue-400 font-mono flex items-center gap-1">
                    <Droplets className="size-3.5" /> {e.quantidadeMl}ml
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    e.status === 'executado' ? 'bg-green-500/15 text-green-400' :
                    e.status === 'falhou' ? 'bg-red-500/15 text-red-400' :
                    'bg-yellow-500/15 text-yellow-400'
                  }`}>{e.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
