import Link from 'next/link'
import Image from 'next/image'
import type { JellyfinServer, RfidTag } from '@prisma/client'
import { Card, CardContent, StatusIndicator } from '@/components/ui'
import type { StatusType } from '@/components/ui/StatusIndicator'

const jellyfinStatusMap: Record<string, { type: StatusType; label: string }> = {
  CONNECTED: { type: 'success', label: 'Connected' },
  UNREACHABLE: { type: 'warning', label: 'Unreachable' },
  AUTH_ERROR: { type: 'error', label: 'Auth Error' },
  UNKNOWN: { type: 'neutral', label: 'Not linked' },
}

type RecentTag = Pick<RfidTag, 'id' | 'label' | 'jellyfinItemId' | 'jellyfinItemImageTag' | 'jellyfinItemTitle'>

interface DashboardSidebarProps {
  server: JellyfinServer | null
  deviceCount: number
  tagCount: number
  weeklyPlays: number
  recentTags: RecentTag[]
  operatingHoursEnabled: boolean
  operatingHoursStart: string | null
  operatingHoursEnd: string | null
}

export default function DashboardSidebar({
  server,
  deviceCount,
  tagCount,
  weeklyPlays,
  recentTags,
  operatingHoursEnabled,
  operatingHoursStart,
  operatingHoursEnd,
}: DashboardSidebarProps) {
  const jfStatus = server
    ? jellyfinStatusMap[server.status] ?? jellyfinStatusMap.UNKNOWN
    : { type: 'neutral' as StatusType, label: 'Not linked' }

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <Link href="/dashboard/jellyfin" className="flex items-center justify-between hover:opacity-80 transition-opacity">
            <span className="text-xs text-jf-text-muted">Jellyfin</span>
            <StatusIndicator status={jfStatus.type} label={jfStatus.label} />
          </Link>
          <div className="border-t border-jf-border" />
          <Link href="/dashboard/devices" className="flex items-center justify-between hover:opacity-80 transition-opacity">
            <span className="text-xs text-jf-text-muted">Devices</span>
            <span className="text-sm font-semibold text-jf-text-primary">{deviceCount}</span>
          </Link>
          <Link href="/dashboard/tags" className="flex items-center justify-between hover:opacity-80 transition-opacity">
            <span className="text-xs text-jf-text-muted">Tags</span>
            <span className="text-sm font-semibold text-jf-text-primary">{tagCount}</span>
          </Link>
          <div className="flex items-center justify-between">
            <span className="text-xs text-jf-text-muted">Plays this week</span>
            <span className="text-sm font-semibold text-jf-primary">{weeklyPlays}</span>
          </div>
        </CardContent>
      </Card>

      {/* Operating hours status */}
      {operatingHoursEnabled && operatingHoursStart && operatingHoursEnd && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-3.5 h-3.5 text-jf-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-jf-text-muted uppercase tracking-wider">Operating hours</span>
            </div>
            <p className="text-sm text-jf-text-primary font-medium">
              {operatingHoursStart} – {operatingHoursEnd}
            </p>
            <Link href="/dashboard/account" className="text-xs text-jf-primary hover:underline mt-1 block">
              Change hours
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent tags */}
      {recentTags.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-jf-text-muted uppercase tracking-wider">Recent tags</span>
              <Link href="/dashboard/tags" className="text-xs text-jf-primary hover:underline">All tags</Link>
            </div>
            <div className="space-y-2">
              {recentTags.map((tag) => {
                const hasArt = !!(tag.jellyfinItemImageTag && tag.jellyfinItemId)
                return (
                  <Link
                    key={tag.id}
                    href={`/dashboard/tags/${tag.id}`}
                    className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
                  >
                    <div className="relative w-8 h-8 rounded flex-shrink-0 bg-jf-elevated border border-jf-border overflow-hidden">
                      {hasArt ? (
                        <Image
                          src={`/api/jellyfin/image?itemId=${tag.jellyfinItemId}&tag=${tag.jellyfinItemImageTag}&width=64`}
                          alt={tag.jellyfinItemTitle ?? tag.label}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-jf-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-jf-text-primary truncate">{tag.label}</p>
                      {tag.jellyfinItemTitle && (
                        <p className="text-xs text-jf-text-muted truncate">{tag.jellyfinItemTitle}</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
