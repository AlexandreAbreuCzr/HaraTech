import { type SelectHTMLAttributes, forwardRef, useId } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', ...props }, ref) => {
    const generatedId = useId()
    const id = props.id ?? generatedId
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          className={`h-10 w-full cursor-pointer appearance-none rounded-lg border bg-white px-3.5 text-sm text-black outline-none transition-all duration-150
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-[var(--border-primary)] focus:border-black'
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
