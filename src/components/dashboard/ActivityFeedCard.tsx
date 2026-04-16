import Image from 'next/image'
import type { ActivityLog, RfidTag } from '@prisma/client'
import { formatRelativeTime } from '@/lib/utils'
import { Badge } from '@/components/ui'

type LogWithTag = ActivityLog & {
  device: { name: string } | null
  rfidTag: Pick<RfidTag, 'jellyfinItemImageTag' | 'jellyfinItemId'> | null
}

const ERROR_LABELS: Record<string, string> = {
  UNASSIGNED: 'Unassigned',
  OFFLINE: 'Offline',
  AUTH_ERROR: 'Auth error',
  RATE_LIMITED: 'Rate limited',
  OUTSIDE_HOURS: 'Outside hours',
  NO_CLIENT: 'No client',
  UNKNOWN: 'Unknown',
}

export default function ActivityFeedCard({ log }: { log: LogWithTag }) {
  const imageTag = log.rfidTag?.jellyfinItemImageTag
  const itemId = log.rfidTag?.jellyfinItemId
  const hasArt = !!(imageTag && itemId)

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-jf-elevated transition-colors group">
      {/* Artwork */}
      <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-jf-elevated border border-jf-border">
        {hasArt ? (
          <Image
            src={`/api/jellyfin/image?itemId=${itemId}&tag=${imageTag}&width=96`}
            alt={log.jellyfinItemTitle ?? 'artwork'}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-jf-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-jf-text-primary truncate">
          {log.jellyfinItemTitle ?? (
            <span className="text-jf-text-muted italic">
              {log.errorCode === 'UNASSIGNED' ? 'Unassigned tag' : 'Unknown content'}
            </span>
          )}
        </p>
        <p className="text-xs text-jf-text-muted truncate mt-0.5">
          {log.device?.name ?? log.deviceName}
          {' · '}
          <code className="font-mono">{log.tagId.slice(0, 8)}</code>
        </p>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-jf-success' : 'bg-jf-error'}`} />
        {!log.success && log.errorCode && (
          <Badge variant="error" className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5">
            {ERROR_LABELS[log.errorCode] ?? log.errorCode}
          </Badge>
        )}
        <span className="text-xs text-jf-text-muted whitespace-nowrap">
          {formatRelativeTime(log.createdAt)}
        </span>
      </div>
    </div>
  )
}
