import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      <div className="size-12 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] mb-4">
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
