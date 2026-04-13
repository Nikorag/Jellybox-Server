import { cn } from '@/lib/utils'

export type StatusType = 'success' | 'warning' | 'error' | 'neutral'

export interface StatusIndicatorProps {
  status: StatusType
  label: string
  className?: string
}

const dotClasses: Record<StatusType, string> = {
  success: 'bg-jf-success',
  warning: 'bg-jf-warning',
  error: 'bg-jf-error',
  neutral: 'bg-jf-text-muted',
}

const textClasses: Record<StatusType, string> = {
  success: 'text-jf-success',
  warning: 'text-jf-warning',
  error: 'text-jf-error',
  neutral: 'text-jf-text-muted',
}

export default function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('w-2 h-2 rounded-full flex-shrink-0', dotClasses[status])}
        aria-hidden="true"
      />
      <span className={cn('text-sm font-medium', textClasses[status])}>{label}</span>
    </span>
  )
}
