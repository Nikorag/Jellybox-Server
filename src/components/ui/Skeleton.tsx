import { cn } from '@/lib/utils'

export interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-jf-elevated', className)}
      aria-hidden="true"
    />
  )
}

/** Pre-built skeleton for a tag card */
export function TagCardSkeleton() {
  return (
    <div className="rounded-xl border border-jf-border bg-jf-surface overflow-hidden">
      <Skeleton className="aspect-[16/9] rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

/** Pre-built skeleton for a device card */
export function DeviceCardSkeleton() {
  return (
    <div className="rounded-xl border border-jf-border bg-jf-surface p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </div>
  )
}
