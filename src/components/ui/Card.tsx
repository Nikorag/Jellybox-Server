import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add a hover glow effect */
  hoverable?: boolean
  /** Render with a slightly elevated background */
  elevated?: boolean
}

/** Base card container with Jellyfin-inspired dark styling */
export default function Card({ hoverable, elevated, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-jf-border shadow-card',
        elevated ? 'bg-jf-elevated' : 'bg-jf-surface',
        hoverable &&
          'transition-shadow hover:shadow-card-hover hover:border-jf-primary/40 cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-4 border-b border-jf-border', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-3 border-t border-jf-border', className)}
      {...props}
    >
      {children}
    </div>
  )
}
