'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { JellyfinServer } from '@prisma/client'
import { Card, CardContent, CardFooter, Button, StatusIndicator, ConfirmDialog } from '@/components/ui'
import { unlinkJellyfinServerAction, saveCustomHeadersAction, testJellyfinConnectionAction } from '@/app/dashboard/jellyfin/actions'
import CustomHeadersEditor from './CustomHeadersEditor'
import { formatRelativeTime } from '@/lib/utils'
import type { StatusType } from '@/components/ui/StatusIndicator'

const statusMap: Record<string, { type: StatusType; label: string }> = {
  CONNECTED: { type: 'success', label: 'Connected' },
  UNREACHABLE: { type: 'warning', label: 'Unreachable' },
  AUTH_ERROR: { type: 'error', label: 'Auth Error' },
  UNKNOWN: { type: 'neutral', label: 'Unknown' },
}

export default function JellyfinStatusCard({
  server,
  currentHeaders,
}: {
  server: JellyfinServer
  currentHeaders: Record<string, string>
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const statusInfo = statusMap[server.status] ?? statusMap.UNKNOWN

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const result = await testJellyfinConnectionAction()
    setTesting(false)
    setTestResult({
      ok: result.ok,
      message: result.ok
        ? `Connected to ${result.serverName}`
        : (result.error ?? 'Connection failed.'),
    })
    router.refresh()
  }

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

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            {server.lastCheckedAt && (
              <p className="text-xs text-jf-text-muted">
                Last checked {formatRelativeTime(server.lastCheckedAt)}
              </p>
            )}
            {testResult && (
              <p className={`text-xs font-medium ${testResult.ok ? 'text-jf-success' : 'text-jf-error'}`}>
                {testResult.ok ? '✓' : '✗'} {testResult.message}
              </p>
            )}
          </div>

          <CustomHeadersEditor
            initialHeaders={currentHeaders}
            onSave={saveCustomHeadersAction}
            standalone
          />
        </CardContent>
        <CardFooter className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" loading={testing} onClick={handleTest}>
            Test connection
          </Button>
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
