import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-4 animate-fade-in sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <p className="brand-overline mb-2">Controle Hara</p>
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.035em] text-[var(--text-primary)]">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
