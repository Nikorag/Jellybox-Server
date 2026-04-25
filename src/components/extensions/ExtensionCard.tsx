'use client'

import { useState } from 'react'
import { Badge, Button, ConfirmDialog, Input } from '@/components/ui'
import type { ExtensionClient } from '@/lib/extensions/types'
import type { ExtensionListItem } from './ExtensionsSettings'

type Props = {
  extension: ExtensionListItem
  isAdmin: boolean
  onChange: (item: ExtensionListItem) => void
  onRemove: (id: string) => void
}

export default function ExtensionCard({ extension, isAdmin, onChange, onRemove }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConnect, setShowConnect] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [clients, setClients] = useState<ExtensionClient[] | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

  const connected = !!extension.account
  const manifest = extension.manifest
  const isOAuth = manifest.authFlow === 'oauth'
  const [oauthBusy, setOauthBusy] = useState(false)

  async function startOAuth() {
    setOauthBusy(true); setError(null)
    const res = await fetch(`/api/extensions/${extension.id}/oauth/start`, { method: 'POST' })
    const body = (await res.json().catch(() => ({}))) as { data?: { redirectUrl: string }; error?: string }
    if (!res.ok || !body.data) {
      setOauthBusy(false)
      setError(body.error ?? 'Could not start OAuth flow.')
      return
    }
    // Full-page redirect — works on iOS Safari without popup permission and
    // avoids cross-window state. The OAuth callback page brings the user
    // back to /dashboard/settings/extensions when done.
    window.location.href = body.data.redirectUrl
  }

  async function refreshManifest() {
    setBusy('refresh'); setError(null)
    const res = await fetch(`/api/extensions/${extension.id}/refresh-manifest`, { method: 'POST' })
    setBusy(null)
    const body = (await res.json()) as { data?: ExtensionListItem; error?: string }
    if (!res.ok || !body.data) { setError(body.error ?? 'Refresh failed.'); return }
    onChange(body.data)
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault()
    setBusy('connect'); setError(null)
    const res = await fetch(`/api/extensions/${extension.id}/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
    setBusy(null)
    const body = (await res.json()) as { data?: ExtensionListItem; error?: string }
    if (!res.ok || !body.data) { setError(body.error ?? 'Connect failed.'); return }
    onChange(body.data)
    setShowConnect(false)
    setFields({})
  }

  async function disconnect() {
    setBusy('disconnect'); setError(null)
    const res = await fetch(`/api/extensions/${extension.id}/account`, { method: 'DELETE' })
    setBusy(null)
    setConfirmDisconnect(false)
    if (!res.ok) {
      const body = (await res.json()) as { error?: string }
      setError(body.error ?? 'Disconnect failed.')
      return
    }
    onChange({ ...extension, account: null })
    setClients(null)
  }

  async function loadClients() {
    setBusy('clients'); setError(null)
    const res = await fetch(`/api/extensions/${extension.id}/clients`)
    setBusy(null)
    const body = (await res.json()) as { data?: ExtensionClient[]; error?: string }
    if (!res.ok || !body.data) { setError(body.error ?? 'Could not load clients.'); return }
    setClients(body.data)
  }

  async function setDefaultClient(clientId: string | null) {
    setBusy('default-client'); setError(null)
    const res = await fetch(`/api/extensions/${extension.id}/account`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultClientId: clientId }),
    })
    setBusy(null)
    if (!res.ok) {
      const body = (await res.json()) as { error?: string }
      setError(body.error ?? 'Could not set client.')
      return
    }
    onChange({
      ...extension,
      account: extension.account ? { ...extension.account, defaultClientId: clientId } : null,
    })
  }

  async function remove() {
    setBusy('remove')
    const res = await fetch(`/api/extensions/${extension.id}`, { method: 'DELETE' })
    setBusy(null)
    setConfirmRemove(false)
    if (res.ok) onRemove(extension.id)
  }

  return (
    <div className="border border-jf-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-jf-text-primary truncate">{extension.name}</h3>
            <Badge variant={connected ? 'success' : 'neutral'}>
              {connected ? 'Connected' : 'Not connected'}
            </Badge>
            <span className="text-xs text-jf-text-muted">v{manifest.version}</span>
          </div>
          <p className="text-xs text-jf-text-muted truncate mt-0.5">{extension.baseUrl}</p>
          {connected && extension.account && (
            <p className="text-xs text-jf-text-secondary mt-1">
              Your account: {extension.account.displayName}
            </p>
          )}
        </div>
        {isAdmin && (
          <Button variant="destructive" size="sm" onClick={() => setConfirmRemove(true)}>
            Remove
          </Button>
        )}
      </div>

      {error && (
        <div className="p-2 rounded bg-jf-error/10 border border-jf-error/30 text-jf-error text-xs">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isAdmin && (
          <Button size="sm" variant="secondary" onClick={refreshManifest} loading={busy === 'refresh'}>
            Refresh manifest
          </Button>
        )}
        {!connected && !isOAuth && (
          <Button size="sm" onClick={() => setShowConnect((v) => !v)}>
            {showConnect ? 'Cancel' : 'Connect'}
          </Button>
        )}
        {!connected && isOAuth && (
          <Button size="sm" onClick={startOAuth} loading={oauthBusy}>
            Connect with {extension.name}
          </Button>
        )}
        {connected && (
          <Button size="sm" variant="secondary" onClick={() => setConfirmDisconnect(true)}>
            Disconnect
          </Button>
        )}
        {connected && manifest.capabilities.listClients && (
          <Button size="sm" variant="secondary" onClick={loadClients} loading={busy === 'clients'}>
            {clients ? 'Refresh clients' : 'Load clients'}
          </Button>
        )}
      </div>

      {showConnect && !connected && !isOAuth && (
        <form onSubmit={connect} className="space-y-3 pt-2 border-t border-jf-border">
          {manifest.authFields.map((f) => (
            <Input
              key={f.key}
              label={f.label}
              type={f.secret ? 'password' : 'text'}
              required={f.required}
              value={fields[f.key] ?? ''}
              onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          ))}
          <Button type="submit" size="sm" loading={busy === 'connect'}>Connect</Button>
        </form>
      )}

      {connected && clients !== null && (
        <div className="pt-2 border-t border-jf-border">
          <label className="block text-xs font-medium text-jf-text-secondary mb-1.5">
            Default playback client
          </label>
          {clients.length === 0 ? (
            <p className="text-xs text-jf-text-muted">No clients reported.</p>
          ) : (
            <select
              value={extension.account?.defaultClientId ?? ''}
              onChange={(e) => setDefaultClient(e.target.value || null)}
              disabled={busy === 'default-client'}
              className="form-select w-full rounded-lg border border-jf-border bg-jf-elevated text-sm text-jf-text-primary focus:border-jf-primary focus:ring-jf-primary/30"
            >
              <option value="">— None —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={remove}
        title="Remove extension?"
        description={`This will deregister "${extension.name}" for everyone on this Jellybox and unlink any tags pointing at it.`}
        confirmLabel="Remove"
        loading={busy === 'remove'}
      />

      <ConfirmDialog
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={disconnect}
        title="Disconnect your account?"
        description={`Your tags pointing at "${extension.name}" will stop playing until you reconnect.`}
        confirmLabel="Disconnect"
        loading={busy === 'disconnect'}
      />
    </div>
  )
}
