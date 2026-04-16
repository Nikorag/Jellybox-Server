'use client'

import { useState } from 'react'
import type { Webhook } from '@prisma/client'
import { Card, CardContent, CardHeader, Button, Input, ConfirmDialog } from '@/components/ui'
import { createWebhookAction, deleteWebhookAction } from '@/app/dashboard/settings/webhooks/actions'

const EVENT_LABELS: Record<string, string> = {
  JELLYFIN_OFFLINE: 'Jellyfin offline',
}

export default function WebhooksSettings({ webhooks: initial }: { webhooks: Webhook[] }) {
  const [webhooks, setWebhooks] = useState(initial)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [retryDelay, setRetryDelay] = useState(30)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const res = await createWebhookAction({
      label,
      url,
      event: 'JELLYFIN_OFFLINE',
      retryDelaySeconds: retryDelay,
    })
    setSaving(false)
    if (res.error) {
      setMessage({ type: 'error', text: res.error })
    } else {
      setMessage({ type: 'success', text: 'Webhook created.' })
      setLabel('')
      setUrl('')
      setRetryDelay(30)
      // Optimistic — page will revalidate on next visit
      window.location.reload()
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteWebhookAction(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    setWebhooks((prev) => prev.filter((w) => w.id !== deleteTarget.id))
  }

  return (
    <div className="space-y-5 max-w-lg">
      {/* Existing webhooks */}
      {webhooks.length > 0 && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold text-jf-text-primary">Active webhooks</h2></CardHeader>
          <CardContent className="space-y-3">
            {webhooks.map((w) => (
              <div key={w.id} className="flex items-start justify-between gap-4 py-2 border-b border-jf-border last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-jf-text-primary truncate">{w.label}</p>
                  <p className="text-xs text-jf-text-muted truncate">{w.url}</p>
                  <p className="text-xs text-jf-text-muted mt-0.5">
                    {EVENT_LABELS[w.event] ?? w.event} · retry after {w.retryDelaySeconds}s
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteTarget(w)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Add new webhook */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-jf-text-primary">Add webhook</h2></CardHeader>
        <CardContent>
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${
              message.type === 'success'
                ? 'bg-jf-success/10 border-jf-success/30 text-jf-success'
                : 'bg-jf-error/10 border-jf-error/30 text-jf-error'
            }`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="e.g. Wake living room TV"
            />
            <Input
              label="URL"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              placeholder="https://homeassistant.local/api/webhook/..."
              helperText="A POST request with no body will be sent to this URL."
            />
            <div>
              <label className="block text-xs font-medium text-jf-text-secondary mb-1.5">
                Event
              </label>
              <div className="px-3 py-2 rounded-lg border border-jf-border bg-jf-elevated text-sm text-jf-text-primary">
                Jellyfin offline
              </div>
              <p className="mt-1 text-xs text-jf-text-muted">More events coming soon.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-jf-text-secondary mb-1.5">
                Retry delay: {retryDelay}s
              </label>
              <input
                type="range"
                min={5}
                max={55}
                step={5}
                value={retryDelay}
                onChange={(e) => setRetryDelay(Number(e.target.value))}
                className="w-full accent-jf-primary"
              />
              <p className="mt-1 text-xs text-jf-text-muted">
                How long to wait after firing the webhook before retrying playback.
              </p>
            </div>
            <Button type="submit" loading={saving}>Add webhook</Button>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove webhook?"
        description={`This will permanently remove "${deleteTarget?.label}". It will no longer be called when Jellyfin is offline.`}
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  )
}
