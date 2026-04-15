'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card, CardContent } from '@/components/ui'
import CustomHeadersEditor from './CustomHeadersEditor'

type Mode = 'credentials' | 'apikey'

export default function JellyfinConnectForm() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('credentials')
  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const body =
      mode === 'credentials'
        ? { mode, serverUrl, username, password, customHeaders }
        : { mode, serverUrl, apiKey, customHeaders }

    const res = await fetch('/api/jellyfin/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = (await res.json()) as { error?: string }
    setIsPending(false)

    if (!res.ok) {
      setError(data.error ?? 'Connection failed. Please try again.')
      return
    }

    router.refresh()
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-base font-semibold text-jf-text-primary mb-1">
          Link your Jellyfin server
        </h2>
        <p className="text-sm text-jf-text-secondary mb-5">
          Enter your server URL and credentials to connect.
        </p>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 rounded-lg bg-jf-elevated border border-jf-border mb-5 w-fit">
          {(['credentials', 'apikey'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-jf-primary text-white'
                  : 'text-jf-text-muted hover:text-jf-text-primary'
              }`}
            >
              {m === 'credentials' ? 'Username & Password' : 'API Key'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Server URL"
            type="url"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            required
            placeholder="https://jellyfin.example.com"
            helperText="Include http:// or https:// and the port if needed."
          />

          {mode === 'credentials' ? (
            <>
              <Input
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Your Jellyfin username"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                helperText="Used only to retrieve an API token. Never stored."
              />
            </>
          ) : (
            <Input
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              placeholder="Paste your Jellyfin API key"
              helperText="Find this in Jellyfin → Dashboard → API Keys."
            />
          )}

          {/* Advanced — custom headers */}
          <div className="border-t border-jf-border pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-jf-text-muted hover:text-jf-text-primary transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Advanced
            </button>

            {showAdvanced && (
              <div className="mt-3">
                <CustomHeadersEditor
                  initialHeaders={customHeaders}
                  onSave={async (h) => { setCustomHeaders(h) }}
                />
              </div>
            )}
          </div>

          <Button type="submit" loading={isPending} className="w-full">
            Connect to Jellyfin
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
