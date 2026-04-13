import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  /** Icon or illustration to display */
  icon?: ReactNode
  title: string
  description?: string
  /** Optional call-to-action element (e.g. a Button) */
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-jf-elevated border border-jf-border flex items-center justify-center mb-4 text-jf-text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-jf-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-jf-text-secondary max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
