import { cn } from '@/lib/utils'

export interface SpinnerProps {
  /** Size of the spinner in Tailwind size classes */
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Accessible label */
  label?: string
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
}

export default function Spinner({ size = 'md', className, label = 'Loading…' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block rounded-full border-jf-primary border-t-transparent animate-spin',
        sizeClasses[size],
        className,
      )}
    />
  )
}
