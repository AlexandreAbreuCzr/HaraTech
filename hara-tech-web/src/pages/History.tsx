import { useState } from 'react'
import Layout from '../components/Layout'
import { historicoStore } from '../lib/store'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { History as HistoryIcon, Droplets, CheckCircle2, XCircle, Timer } from 'lucide-react'

const filtros = [
  { value: 'todos', label: 'Todos' },
  { value: 'executado', label: 'Executados' },
  { value: 'falhou', label: 'Falhas' },
  { value: 'cancelado', label: 'Cancelados' },
] as const

const statusConfig: Record<string, { icon: React.ReactNode; badge: 'success' | 'danger' | 'warning' }> = {
  executado: { icon: <CheckCircle2 className="size-4" />, badge: 'success' },
  falhou: { icon: <XCircle className="size-4" />, badge: 'danger' },
  cancelado: { icon: <Timer className="size-4" />, badge: 'warning' },
}

export default function History() {
  const [eventos] = useState(historicoStore.list())
  const [filtro, setFiltro] = useState<string>('todos')

  const filtered = filtro === 'todos' ? eventos : eventos.filter(e => e.status === filtro)

  return (
    <Layout>
      <PageHeader
        title="Histórico"
        description={`${eventos.length} evento${eventos.length !== 1 ? 's' : ''} registrado${eventos.length !== 1 ? 's' : ''}`}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filtros.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer
              ${filtro === f.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="size-6" />}
          title="Nenhum evento encontrado"
          description={filtro !== 'todos' ? 'Tente outro filtro' : 'Os registros aparecerão após as irrigações'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((e, idx) => {
            const cfg = statusConfig[e.status]
            return (
              <Card key={e.id} className="animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`size-9 rounded-xl flex items-center justify-center
                      ${e.status === 'executado' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-500' :
                        e.status === 'falhou' ? 'bg-red-50 dark:bg-red-950 text-red-500' :
                        'bg-amber-50 dark:bg-amber-950 text-amber-500'}`}>
                      {cfg?.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{e.culturaNome}</span>
                        <span className="text-xs text-[var(--text-tertiary)]">— {e.zonaNome}</span>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        {new Date(e.data).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-blue-500 flex items-center gap-1">
                      <Droplets className="size-3.5" /> {e.quantidadeMl}ml
                    </span>
                    <Badge variant={cfg?.badge || 'neutral'}>
                      {e.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
