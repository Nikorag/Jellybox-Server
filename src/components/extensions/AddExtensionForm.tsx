'use client'

import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, Input } from '@/components/ui'
import type { ExtensionListItem } from './ExtensionsSettings'

export default function AddExtensionForm({
  onCreated,
}: {
  onCreated: (item: ExtensionListItem) => void
}) {
  const [baseUrl, setBaseUrl] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issuedSecret, setIssuedSecret] = useState<{ extensionName: string; secret: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl }),
      })
      const text = await res.text()
      let body: { data?: ExtensionListItem & { secret: string }; error?: string } = {}
      try { body = JSON.parse(text) } catch { /* non-JSON response */ }
      if (!res.ok || !body.data) {
        setError(body.error ?? `Register failed (${res.status}). ${text.slice(0, 200)}`)
        return
      }
      const { secret, ...item } = body.data
      onCreated(item)
      setIssuedSecret({ extensionName: item.name, secret })
      setBaseUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-semibold text-jf-text-primary">Add extension</h2>
      </CardHeader>
      <CardContent>
        {issuedSecret ? (
          <div className="space-y-3">
            <p className="text-sm text-jf-text-primary">
              <span className="font-medium">{issuedSecret.extensionName}</span>{' '}
              registered. Copy this shared secret into the extension&apos;s own configuration — Jellybox sends it as a bearer token on every call.
            </p>
            <pre className="p-3 rounded-lg bg-jf-elevated border border-jf-border text-xs text-jf-text-primary overflow-x-auto select-all">
              {issuedSecret.secret}
            </pre>
            <p className="text-xs text-jf-text-muted">
              We won&apos;t show this again — store it now if you need it later.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setIssuedSecret(null)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
                {error}
              </div>
            )}
            <Input
              label="Extension URL"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
              placeholder="http://localhost:4555"
              helperText="Jellybox will fetch /manifest from this URL to discover the extension."
            />
            <Button type="submit" loading={pending}>Register</Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
