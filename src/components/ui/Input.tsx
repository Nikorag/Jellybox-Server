import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the input */
  label?: string
  /** Helper text rendered below the input */
  helperText?: string
  /** Error message — replaces helperText and styles input red */
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-jf-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'form-input w-full rounded-lg bg-jf-elevated border text-jf-text-primary',
            'placeholder:text-jf-text-muted text-sm transition-colors',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-jf-error focus:border-jf-error focus:ring-jf-error/30'
              : 'border-jf-border focus:border-jf-primary focus:ring-jf-primary/30',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-jf-error" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-jf-text-muted">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export default Input
