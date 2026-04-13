'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { JellyfinServer } from '@prisma/client'
import { Card, CardContent, CardFooter, Button, StatusIndicator, ConfirmDialog } from '@/components/ui'
import { unlinkJellyfinServerAction } from '@/app/dashboard/jellyfin/actions'
import { formatRelativeTime } from '@/lib/utils'
import type { StatusType } from '@/components/ui/StatusIndicator'

const statusMap: Record<string, { type: StatusType; label: string }> = {
  CONNECTED: { type: 'success', label: 'Connected' },
  UNREACHABLE: { type: 'warning', label: 'Unreachable' },
  AUTH_ERROR: { type: 'error', label: 'Auth Error' },
  UNKNOWN: { type: 'neutral', label: 'Unknown' },
}

export default function JellyfinStatusCard({ server }: { server: JellyfinServer }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  const statusInfo = statusMap[server.status] ?? statusMap.UNKNOWN

  async function handleUnlink() {
    setUnlinking(true)
    await unlinkJellyfinServerAction()
    setUnlinking(false)
    setConfirmOpen(false)
    router.refresh()
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-jf-text-primary mb-0.5">
                {server.serverName ?? 'Jellyfin Server'}
              </h2>
              <p className="text-sm text-jf-text-muted mb-3 break-all">{server.serverUrl}</p>
              <StatusIndicator status={statusInfo.type} label={statusInfo.label} />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              Unlink
            </Button>
          </div>

          {server.lastCheckedAt && (
            <p className="mt-4 text-xs text-jf-text-muted">
              Last checked {formatRelativeTime(server.lastCheckedAt)}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Link href="/dashboard/jellyfin/clients">
            <Button variant="secondary" size="sm">
              Manage Clients
            </Button>
          </Link>
          <Link href="/dashboard/tags">
            <Button variant="ghost" size="sm">
              Assign Tags
            </Button>
          </Link>
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleUnlink}
        title="Unlink Jellyfin server?"
        description="This will remove your Jellyfin connection. Your devices and tags will remain, but playback will stop working until you reconnect."
        confirmLabel="Unlink server"
        loading={unlinking}
      />
    </>
  )
}
