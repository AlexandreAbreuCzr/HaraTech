import { type SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full h-10 px-3.5 rounded-xl border bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none transition-all duration-150 text-sm appearance-none cursor-pointer
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-[var(--border-primary)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
            }
            ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
