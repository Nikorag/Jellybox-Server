import Link from 'next/link'
import type { JellyfinServer } from '@prisma/client'
import { Card, CardContent, StatusIndicator } from '@/components/ui'
import type { StatusType } from '@/components/ui/StatusIndicator'

const jellyfinStatusMap: Record<string, { type: StatusType; label: string }> = {
  CONNECTED: { type: 'success', label: 'Connected' },
  UNREACHABLE: { type: 'warning', label: 'Unreachable' },
  AUTH_ERROR: { type: 'error', label: 'Auth Error' },
  UNKNOWN: { type: 'neutral', label: 'Not linked' },
}

interface OverviewStatsProps {
  server: JellyfinServer | null
  deviceCount: number
  tagCount: number
  recentSuccessCount: number
}

export default function OverviewStats({
  server,
  deviceCount,
  tagCount,
  recentSuccessCount,
}: OverviewStatsProps) {
  const jfStatus = server
    ? jellyfinStatusMap[server.status] ?? jellyfinStatusMap.UNKNOWN
    : { type: 'neutral' as StatusType, label: 'Not linked' }

  const stats = [
    {
      label: 'Jellyfin Server',
      value: server?.serverName ?? 'Not linked',
      sub: <StatusIndicator status={jfStatus.type} label={jfStatus.label} />,
      href: '/dashboard/jellyfin',
    },
    {
      label: 'Devices',
      value: String(deviceCount),
      sub: <span className="text-xs text-jf-text-muted">paired</span>,
      href: '/dashboard/devices',
    },
    {
      label: 'Tags',
      value: String(tagCount),
      sub: <span className="text-xs text-jf-text-muted">registered</span>,
      href: '/dashboard/tags',
    },
    {
      label: 'Recent plays',
      value: String(recentSuccessCount),
      sub: <span className="text-xs text-jf-text-muted">successful (last 50)</span>,
      href: null,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const inner = (
          <CardContent className="py-5 flex flex-col justify-between min-h-[110px]">
            <p className="text-xs font-medium text-jf-text-muted uppercase tracking-wider mb-1.5">
              {stat.label}
            </p>
            <div>
              <p className="text-2xl font-bold text-jf-text-primary mb-1 truncate">{stat.value}</p>
              {stat.sub}
            </div>
          </CardContent>
        )

        return stat.href ? (
          <Link key={stat.label} href={stat.href} className="block h-full">
            <Card hoverable className="h-full">{inner}</Card>
          </Link>
        ) : (
          <Card key={stat.label} className="h-full">{inner}</Card>
        )
      })}
    </div>
  )
}
