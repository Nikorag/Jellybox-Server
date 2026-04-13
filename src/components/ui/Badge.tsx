import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Colour variant */
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-jf-success/10 text-jf-success border-jf-success/30',
  warning: 'bg-jf-warning/10 text-jf-warning border-jf-warning/30',
  error: 'bg-jf-error/10 text-jf-error border-jf-error/30',
  info: 'bg-jf-info/10 text-jf-info border-jf-info/30',
  neutral: 'bg-jf-elevated text-jf-text-muted border-jf-border',
  primary: 'bg-jf-primary-muted text-jf-primary border-jf-primary/30',
}

export default function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
