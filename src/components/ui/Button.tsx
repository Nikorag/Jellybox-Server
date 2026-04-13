import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Visual style variant of the button */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
/** Size variant of the button */
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant
  /** Size variant */
  size?: ButtonSize
  /** When true, renders a full-width spinner and disables interaction */
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-jf-primary hover:bg-jf-primary-hover text-white border-transparent',
  secondary:
    'bg-jf-elevated hover:bg-jf-overlay text-jf-text-primary border-jf-border',
  ghost:
    'bg-transparent hover:bg-jf-elevated text-jf-text-secondary hover:text-jf-text-primary border-transparent',
  destructive:
    'bg-jf-error/10 hover:bg-jf-error/20 text-jf-error border-jf-error/30',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium border transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jf-primary/50',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <span
              className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    )
  },
)
Button.displayName = 'Button'

export default Button
