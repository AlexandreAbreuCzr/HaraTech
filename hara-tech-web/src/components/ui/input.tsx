import { type InputHTMLAttributes, forwardRef, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const generatedId = useId()
    const id = props.id ?? generatedId
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          className={`h-10 w-full rounded-lg border bg-white px-3.5 text-sm text-black outline-none transition-all duration-150 placeholder:text-[var(--text-tertiary)]
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-[var(--border-primary)] focus:border-black'
            }
            ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
