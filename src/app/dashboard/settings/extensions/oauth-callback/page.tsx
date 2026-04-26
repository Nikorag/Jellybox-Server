'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SETTINGS_URL = '/dashboard/settings/extensions'

/// Landing page for OAuth provider redirects. Reads `state` and `code` from
/// the query string (or `error`), forwards them to /api/extensions/oauth/complete,
/// then redirects back to the settings page. The extension is contacted
/// server-to-server by Jellybox for the token exchange — it never has to be
/// publicly reachable.
export default function OAuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'pending' | 'error'>('pending')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const state = params.get('state')
    const code = params.get('code')
    const error = params.get('error_description') ?? params.get('error')

    if (error) {
      setStatus('error')
      setMessage(error)
      return
    }
    if (!state || !code) {
      setStatus('error')
      setMessage('Missing OAuth callback parameters.')
      return
    }

    void (async () => {
      try {
        const res = await fetch('/api/extensions/oauth/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, code }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          setStatus('error')
          setMessage(body.error ?? `Failed (${res.status}).`)
          return
        }
        // Replace history so back-button doesn't take the user through the
        // OAuth callback URL (which would re-POST a now-stale code).
        router.replace(SETTINGS_URL)
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Network error.')
      }
    })()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-3">
        {status === 'pending' && (
          <p className="text-sm text-jf-text-secondary">Finishing connection…</p>
        )}
        {status === 'error' && (
          <>
            <p className="text-sm font-medium text-jf-error">Connection failed</p>
            {message && <p className="text-xs text-jf-text-muted">{message}</p>}
            <button
              type="button"
              onClick={() => router.replace(SETTINGS_URL)}
              className="text-xs underline text-jf-text-secondary hover:text-jf-text-primary"
            >
              Back to extensions
            </button>
          </>
        )}
      </div>
    </div>
  )
}
