'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, Button, Input, ConfirmDialog, Badge } from '@/components/ui'
import {
  createNotificationChannelAction,
  deleteNotificationChannelAction,
  testNotificationChannelAction,
  toggleNotificationChannelAction,
} from '@/app/dashboard/settings/notifications/actions'

export type ChannelDisplay = {
  id: string
  type: 'NTFY' | 'DISCORD' | 'SLACK'
  label: string
  enabled: boolean
  events: ('TAG_SCANNED' | 'PLAYBACK_FAILED')[]
  displayConfig: string
}

type ChannelType = 'NTFY' | 'DISCORD' | 'SLACK'
type NotificationEvent = 'TAG_SCANNED' | 'PLAYBACK_FAILED'

const TYPE_LABELS: Record<ChannelType, string> = {
  NTFY: 'ntfy.sh',
  DISCORD: 'Discord',
  SLACK: 'Slack',
}

const EVENT_LABELS: Record<NotificationEvent, string> = {
  TAG_SCANNED: 'Tag scanned',
  PLAYBACK_FAILED: 'Playback failed',
}

const ALL_EVENTS: NotificationEvent[] = ['TAG_SCANNED', 'PLAYBACK_FAILED']

const defaultConfig: Record<ChannelType, Record<string, string>> = {
  NTFY:    { url: '', token: '' },
  DISCORD: { webhookUrl: '' },
  SLACK:   { webhookUrl: '' },
}

export default function NotificationsSettings({ channels: initial }: { channels: ChannelDisplay[] }) {
  const [channels, setChannels] = useState(initial)
  const [type, setType] = useState<ChannelType>('NTFY')
  const [label, setLabel] = useState('')
  const [config, setConfig] = useState<Record<string, string>>(defaultConfig.NTFY)
  const [events, setEvents] = useState<NotificationEvent[]>(['TAG_SCANNED', 'PLAYBACK_FAILED'])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ChannelDisplay | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean } | null>(null)

  function handleTypeChange(t: ChannelType) {
    setType(t)
    setConfig(defaultConfig[t])
  }

  function toggleEvent(event: NotificationEvent) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (events.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one event.' })
      return
    }
    setSaving(true)
    setMessage(null)
    const res = await createNotificationChannelAction({ label, type, events, config })
    setSaving(false)
    if (res.error) {
      setMessage({ type: 'error', text: res.error })
    } else {
      setMessage({ type: 'success', text: 'Channel added.' })
      setLabel('')
      setConfig(defaultConfig[type])
      setEvents(['TAG_SCANNED', 'PLAYBACK_FAILED'])
      window.location.reload()
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await deleteNotificationChannelAction(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    setChannels((prev) => prev.filter((c) => c.id !== deleteTarget.id))
  }

  async function handleTest(channel: ChannelDisplay) {
    setTestingId(channel.id)
    setTestResult(null)
    const res = await testNotificationChannelAction(channel.id)
    setTestingId(null)
    setTestResult({ id: channel.id, ok: !res.error })
    setTimeout(() => setTestResult(null), 4000)
  }

  async function handleToggle(channel: ChannelDisplay) {
    const next = !channel.enabled
    setChannels((prev) => prev.map((c) => c.id === channel.id ? { ...c, enabled: next } : c))
    await toggleNotificationChannelAction(channel.id, next)
  }

  return (
    <div className="space-y-5 max-w-lg">
      {channels.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-jf-text-primary">Active channels</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-start justify-between gap-4 py-2 border-b border-jf-border last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-jf-text-primary truncate">{ch.label}</p>
                    <Badge variant="neutral" className="text-[10px] shrink-0">{TYPE_LABELS[ch.type]}</Badge>
                    {!ch.enabled && <Badge variant="neutral" className="text-[10px] shrink-0">Paused</Badge>}
                  </div>
                  <p className="text-xs text-jf-text-muted truncate">{ch.displayConfig}</p>
                  <p className="text-xs text-jf-text-muted mt-0.5">
                    {ch.events.map((e) => EVENT_LABELS[e]).join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={testingId === ch.id}
                    onClick={() => handleTest(ch)}
                    title="Send a test notification"
                  >
                    {testResult?.id === ch.id
                      ? testResult.ok ? '✓ Sent' : '✗ Failed'
                      : 'Test'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggle(ch)}>
                    {ch.enabled ? 'Pause' : 'Enable'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(ch)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-jf-text-primary">Add notification channel</h2>
        </CardHeader>
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
            <div>
              <label className="block text-xs font-medium text-jf-text-secondary mb-1.5">Type</label>
              <div className="flex gap-2">
                {(Object.keys(TYPE_LABELS) as ChannelType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      type === t
                        ? 'border-jf-primary bg-jf-primary-muted text-jf-primary'
                        : 'border-jf-border bg-jf-elevated text-jf-text-secondary hover:text-jf-text-primary'
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="e.g. My phone"
            />

            {type === 'NTFY' && (
              <>
                <Input
                  label="Topic URL"
                  type="url"
                  value={config.url}
                  onChange={(e) => setConfig((c) => ({ ...c, url: e.target.value }))}
                  required
                  placeholder="https://ntfy.sh/my-topic"
                  helperText="The full ntfy topic URL."
                />
                <Input
                  label="Access token (optional)"
                  value={config.token}
                  onChange={(e) => setConfig((c) => ({ ...c, token: e.target.value }))}
                  placeholder="tk_..."
                  helperText="Required only for private topics."
                />
              </>
            )}

            {(type === 'DISCORD' || type === 'SLACK') && (
              <Input
                label="Webhook URL"
                type="url"
                value={config.webhookUrl}
                onChange={(e) => setConfig((c) => ({ ...c, webhookUrl: e.target.value }))}
                required
                placeholder={
                  type === 'DISCORD'
                    ? 'https://discord.com/api/webhooks/...'
                    : 'https://hooks.slack.com/services/...'
                }
                helperText={
                  type === 'DISCORD'
                    ? 'Create one in your Discord channel settings → Integrations.'
                    : 'Create one at api.slack.com/apps → Incoming Webhooks.'
                }
              />
            )}

            <div>
              <label className="block text-xs font-medium text-jf-text-secondary mb-2">Events</label>
              <div className="space-y-2">
                {ALL_EVENTS.map((event) => (
                  <label key={event} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={events.includes(event)}
                      onChange={() => toggleEvent(event)}
                      className="mt-0.5 rounded border-jf-border text-jf-primary focus:ring-jf-primary/30"
                    />
                    <div>
                      <p className="text-sm text-jf-text-primary">{EVENT_LABELS[event]}</p>
                      <p className="text-xs text-jf-text-muted">
                        {event === 'TAG_SCANNED'
                          ? 'Notify when a tag is scanned and playback starts.'
                          : 'Notify when a scan fails after all retries.'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" loading={saving}>Add channel</Button>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove channel?"
        description={`This will permanently remove "${deleteTarget?.label}".`}
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  )
}
