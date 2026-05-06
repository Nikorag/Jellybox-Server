'use client'

import Link from 'next/link'
import type { Device, JellyfinClient } from '@prisma/client'
import { Card, CardContent, Badge, Button } from '@/components/ui'
import { formatRelativeTime } from '@/lib/utils'

type DeviceWithClient = Device & { defaultClient: JellyfinClient | null }

export default function DeviceCard({ device }: { device: DeviceWithClient }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-jf-primary-muted border border-jf-primary/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-jf-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-jf-text-primary text-sm truncate">{device.name}</p>
            <p className="text-xs text-jf-text-muted">
              {device.lastSeenAt
                ? `Last seen ${formatRelativeTime(device.lastSeenAt)}`
                : 'Never connected'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {device.defaultClient && (
            <Badge variant="neutral" className="hidden sm:inline-flex">
              {device.defaultClient.deviceName}
            </Badge>
          )}
          {device.firmwareVersion && (
            <span className="text-xs text-jf-text-muted hidden sm:block">
              {device.firmwareVersion}
            </span>
          )}
          <Link href={`/dashboard/devices/${device.id}`}>
            <Button variant="secondary" size="sm">Settings</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
