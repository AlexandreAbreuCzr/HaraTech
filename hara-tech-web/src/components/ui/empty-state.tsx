import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 animate-fade-in">
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-[var(--border-primary)] text-[var(--text-tertiary)]">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-tertiary)] mb-4 text-center max-w-xs">{description}</p>
      )}
      {action}
    </div>
  )
}
