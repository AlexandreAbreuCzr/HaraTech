import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { api, ApiError } from '../lib/api'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { EmptyState } from '../components/ui/empty-state'
import { PageHeader } from '../components/ui/page-header'
import { Skeleton } from '../components/ui/skeleton'
import {
  History as HistoryIcon,
  Droplets,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from 'lucide-react'
import type { IrrigationLog } from '../lib/types'

const filters = [
  { value: 'all', label: 'Todos' },
  { value: 'in-progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluídos' },
] as const

type Filter = (typeof filters)[number]['value']

const triggerLabels: Record<IrrigationLog['triggeredBy'], string> = {
  MANUAL: 'Manual',
  SCHEDULED: 'Programada',
  SENSOR: 'Sensor',
  AUTOMATION: 'Automação',
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return 'Em andamento'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return remaining ? `${minutes}min ${remaining}s` : `${minutes}min`
}

export default function History() {
  const [logs, setLogs] = useState<IrrigationLog[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.irrigacao.listar()
      setLogs(response.logs)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar o histórico.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = logs.filter((log) =>
    filter === 'all' ||
    (filter === 'in-progress' ? !log.endedAt : Boolean(log.endedAt))
  )

  return (
    <Layout>
      <PageHeader
        title="Histórico"
        description={`${logs.length} irrigação${logs.length !== 1 ? 'ões' : ''} confirmada${logs.length !== 1 ? 's' : ''} pelo dispositivo`}
        actions={<Button variant="secondary" size="sm" onClick={() => void load()} icon={<RefreshCw />}>Atualizar</Button>}
      />

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" aria-label="Filtros do histórico">
        {filters.map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer
              ${filter === item.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, index) => <Skeleton key={index} className="h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon className="size-6" />}
          title="Nenhuma irrigação confirmada"
          description={filter !== 'all' ? 'Tente outro filtro.' : 'Os registros aparecerão depois que o ESP32 confirmar a abertura ou o fechamento de uma área.'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((log, index) => {
            const isCompleted = Boolean(log.endedAt)
            return (
              <Card key={log.id} className="animate-slide-up" style={{ animationDelay: `${index * 30}ms` }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`size-9 shrink-0 rounded-xl flex items-center justify-center ${isCompleted ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                      {isCompleted ? <CheckCircle2 className="size-4" /> : <Clock3 className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-[var(--text-primary)]">
                          {log.zone ? log.zone.name : 'Bomba principal'}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">{log.device.deviceId}</span>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                        Iniciada em {new Date(log.startedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-13 sm:pl-0">
                    <span className="text-sm font-medium text-[var(--accent-water)] flex items-center gap-1">
                      <Droplets className="size-3.5" /> {formatDuration(log.durationSeconds)}
                    </span>
                    <Badge variant={isCompleted ? 'success' : 'warning'}>
                      {isCompleted ? triggerLabels[log.triggeredBy] : 'Em andamento'}
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
