'use client'

import { useState, useEffect } from 'react'
import type { JellyfinClient } from '@prisma/client'
import { Button, Card, CardContent, EmptyState, Spinner } from '@/components/ui'
import { saveJellyfinClientAction, deleteJellyfinClientAction } from '@/app/dashboard/jellyfin/actions'
import { formatRelativeTime } from '@/lib/utils'

interface LiveClient {
  jellyfinDeviceId: string
  deviceName: string
  client: string
  userName?: string
  isPlaying: boolean
  lastActivity: string
}

export default function JellyfinClientList({
  savedClients,
}: {
  savedClients: JellyfinClient[]
}) {
  const [liveClients, setLiveClients] = useState<LiveClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/jellyfin/clients')
      .then((r) => r.json())
      .then((d: { data?: LiveClient[]; error?: string }) => {
        if (d.data) setLiveClients(d.data)
        else setError(d.error ?? 'Failed to load clients.')
      })
      .catch(() => setError('Could not reach Jellyfin server.'))
      .finally(() => setLoading(false))
  }, [])

  const savedIds = new Set(savedClients.map((c) => c.jellyfinDeviceId))

  async function handleSave(client: LiveClient) {
    setSaving(client.jellyfinDeviceId)
    await saveJellyfinClientAction(client.jellyfinDeviceId, client.deviceName)
    setSaving(null)
  }

  async function handleDelete(clientId: string) {
    setDeleting(clientId)
    await deleteJellyfinClientAction(clientId)
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      {/* Live sessions */}
      <section>
        <h3 className="text-sm font-semibold text-jf-text-secondary uppercase tracking-wider mb-3">
          Active sessions
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <p className="text-sm text-jf-error">{error}</p>
        ) : liveClients.length === 0 ? (
          <EmptyState
            title="No active sessions"
            description="Open Jellyfin on a device to see it here."
          />
        ) : (
          <div className="space-y-2">
            {liveClients.map((client) => {
              const isSaved = savedIds.has(client.jellyfinDeviceId)
              return (
                <Card key={client.jellyfinDeviceId}>
                  <CardContent className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-jf-text-primary">{client.deviceName}</p>
                      <p className="text-xs text-jf-text-muted">
                        {client.client}
                        {client.userName ? ` · ${client.userName}` : ''}
                        {client.isPlaying ? ' · Playing' : ''}
                      </p>
                    </div>
                    {isSaved ? (
                      <span className="text-xs text-jf-success font-medium">Saved</span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={saving === client.jellyfinDeviceId}
                        onClick={() => handleSave(client)}
                      >
                        Save
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Saved clients */}
      {savedClients.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-jf-text-secondary uppercase tracking-wider mb-3">
            Saved clients
          </h3>
          <div className="space-y-2">
            {savedClients.map((client) => (
              <Card key={client.id}>
                <CardContent className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-jf-text-primary">{client.deviceName}</p>
                    <p className="text-xs text-jf-text-muted">
                      Last seen {formatRelativeTime(client.lastSeenAt)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    loading={deleting === client.id}
                    onClick={() => handleDelete(client.id)}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
