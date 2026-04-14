'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader, Button, Input, Card, CardContent } from '@/components/ui'
import { createDeviceAction } from '@/app/dashboard/devices/actions'

// ── Constants ─────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

const STEP_LABELS = ['Name', 'Power on', 'Configure', 'Connect']
const POLL_MS = 3_000
const TIMEOUT_MS = 180_000 // 3 minutes
const PORTAL_POLL_MS = 2_000

// WiFiManager portal — accessible when browser is on the Jellybox-Setup AP
const PORTAL_ORIGIN = 'http://192.168.4.1'
const PORTAL_SAVE_URL = `${PORTAL_ORIGIN}/wifisave`

// ── Step indicator ────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  return (
    <nav className="flex items-center mb-8" aria-label="Setup progress">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200',
                  done || active
                    ? 'bg-violet-600 text-white'
                    : 'bg-jf-surface border border-jf-border text-jf-text-muted',
                  active ? 'ring-4 ring-violet-600/20' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {done ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  n
                )}
              </div>
              <span
                className={[
                  'text-xs font-medium hidden sm:block',
                  active ? 'text-jf-text-primary' : 'text-jf-text-muted',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={[
                  'h-px w-10 sm:w-14 mx-1 mb-5 transition-colors duration-300',
                  done ? 'bg-violet-600' : 'bg-jf-border',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

// ── Step 1 — Name ─────────────────────────────────────────────────────────

function StepName({
  isPending,
  error,
  onSubmit,
}: {
  isPending: boolean
  error: string | null
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Card className="max-w-md">
      <CardContent>
        <h2 className="text-base font-semibold text-jf-text-primary mb-1">Name your device</h2>
        <p className="text-sm text-jf-text-secondary mb-5">
          Choose a friendly label — you can change it later.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            name="name"
            label="Device name"
            placeholder="e.g. Living Room"
            required
            autoFocus
          />
          <div className="flex gap-2">
            <Link href="/dashboard/devices">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={isPending}>
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 2 — Power on + portal detection ─────────────────────────────────

function StepPowerOn({
  portalReachable,
  onNext,
}: {
  portalReachable: boolean
  onNext: () => void
}) {
  // Auto-advance shortly after detecting the portal
  useEffect(() => {
    if (!portalReachable) return
    const t = setTimeout(onNext, 900)
    return () => clearTimeout(t)
  }, [portalReachable, onNext])

  return (
    <Card className="max-w-md">
      <CardContent>
        <h2 className="text-base font-semibold text-jf-text-primary mb-1">
          Power on your Jellybox
        </h2>
        <p className="text-sm text-jf-text-secondary mb-5">
          Plug in your device, then connect this device to the{' '}
          <code className="text-xs bg-jf-surface border border-jf-border rounded px-1.5 py-0.5 text-jf-text-primary">
            Jellybox-Setup
          </code>{' '}
          WiFi network.
        </p>

        {/* Animated amber LED ring */}
        <div className="flex justify-center py-6" aria-hidden>
          <div className="relative w-24 h-24">
            <div
              className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping"
              style={{ animationDuration: '2s' }}
            />
            <div
              className="absolute inset-2 rounded-full bg-amber-500/15 animate-pulse"
              style={{ animationDuration: '2s' }}
            />
            <div
              className="absolute inset-4 rounded-full bg-amber-500/30 animate-pulse"
              style={{ animationDuration: '2s', animationDelay: '0.3s' }}
            />
            <div className="absolute inset-6 rounded-full bg-amber-400/80" />
            <div className="absolute inset-8 rounded-full bg-amber-300/60" />
          </div>
        </div>

        <ol className="space-y-3 mb-5">
          <li className="flex gap-3 text-sm text-jf-text-secondary">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-jf-surface border border-jf-border text-jf-text-muted text-xs font-semibold flex items-center justify-center mt-0.5">
              1
            </span>
            <span>Plug your Jellybox into a USB power source.</span>
          </li>
          <li className="flex gap-3 text-sm text-jf-text-secondary">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-jf-surface border border-jf-border text-jf-text-muted text-xs font-semibold flex items-center justify-center mt-0.5">
              2
            </span>
            <span>
              Wait for the LED ring to breathe{' '}
              <span className="text-amber-400 font-medium">amber</span> — setup mode is active.
            </span>
          </li>
          <li className="flex gap-3 text-sm text-jf-text-secondary">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-jf-surface border border-jf-border text-jf-text-muted text-xs font-semibold flex items-center justify-center mt-0.5">
              3
            </span>
            <span>
              On this phone or laptop, join the{' '}
              <code className="text-xs bg-jf-surface border border-jf-border rounded px-1.5 py-0.5 text-jf-text-primary">
                Jellybox-Setup
              </code>{' '}
              WiFi network.
            </span>
          </li>
        </ol>

        {/* Portal detection status */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-jf-surface border border-jf-border">
          {portalReachable ? (
            <>
              <svg
                className="w-4 h-4 text-jf-success flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-sm text-jf-success font-medium">Portal detected — continuing...</span>
            </>
          ) : (
            <>
              <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-jf-text-muted animate-pulse" />
              </span>
              <span className="text-sm text-jf-text-muted">Waiting for Jellybox-Setup portal...</span>
            </>
          )}
        </div>

        <Button onClick={onNext} variant="secondary" className="w-full text-sm">
          Skip detection
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Step 3 — Configure WiFi ───────────────────────────────────────────────

function StepConfigure({
  serverUrl,
  apiKey,
  onNext,
}: {
  serverUrl: string
  apiKey: string
  onNext: () => void
}) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const ssid = (data.get('ssid') as string).trim()
    const password = (data.get('password') as string)

    setIsPending(true)
    setError(null)

    let sent = false
    try {
      // URLSearchParams body → application/x-www-form-urlencoded
      // "Simple" content type: no CORS preflight needed, no headers required on device.
      const body = new URLSearchParams({ s: ssid, p: password, server: serverUrl, apikey: apiKey })
      await fetch(PORTAL_SAVE_URL, { method: 'POST', mode: 'no-cors', body })
      sent = true
    } catch {
      // Two expected failure modes:
      //   1. Device wasn't reachable at all (user not on Jellybox-Setup WiFi)
      //   2. Connection reset because device accepted the form and rebooted (also fine)
      // We can't tell them apart with no-cors, so check if we got any network response at all.
    }

    if (!sent) {
      // Try a quick ping to see if we can reach the portal at all
      try {
        await fetch(PORTAL_ORIGIN, { mode: 'no-cors', signal: AbortSignal.timeout(2000) })
        // Portal is up but save failed for another reason — advance anyway
        sent = true
      } catch {
        setError(
          'Could not reach the Jellybox portal. Make sure this device is connected to the Jellybox-Setup WiFi network.',
        )
        setIsPending(false)
        return
      }
    }

    // Give the device a moment to process before we move on
    await new Promise<void>((r) => setTimeout(r, 800))
    onNext()
  }

  return (
    <Card className="max-w-md">
      <CardContent>
        <h2 className="text-base font-semibold text-jf-text-primary mb-1">Connect to your WiFi</h2>
        <p className="text-sm text-jf-text-secondary mb-5">
          Enter the WiFi network you want your Jellybox to use. The server address and API key
          will be configured automatically.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="ssid"
            label="WiFi Network (SSID)"
            placeholder="e.g. Home WiFi"
            required
            autoFocus
          />
          <Input
            name="password"
            label="WiFi Password"
            type="password"
            placeholder="Leave blank if open network"
          />
          <Button type="submit" loading={isPending} className="w-full">
            Connect Jellybox
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 4 — Connecting ───────────────────────────────────────────────────

function StepConnecting({
  deviceId,
  isOnline,
  timedOut,
  onRetry,
}: {
  deviceId: string
  isOnline: boolean
  timedOut: boolean
  onRetry: () => void
}) {
  if (isOnline) {
    return (
      <Card className="max-w-md">
        <CardContent>
          <div className="flex justify-center py-6" aria-hidden>
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>

          <h2 className="text-base font-semibold text-jf-text-primary text-center mb-1">
            Jellybox is online!
          </h2>
          <p className="text-sm text-jf-text-secondary text-center mb-6">
            Your device connected successfully and is ready to scan tags.
          </p>

          <Link href={`/dashboard/devices/${deviceId}`}>
            <Button className="w-full">Go to Device Settings</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (timedOut) {
    return (
      <Card className="max-w-md">
        <CardContent>
          <h2 className="text-base font-semibold text-jf-text-primary mb-1">Still waiting...</h2>
          <p className="text-sm text-jf-text-secondary mb-5">
            The device hasn&apos;t checked in yet. A few things to check:
          </p>

          <ul className="space-y-2.5 mb-6">
            <li className="flex gap-2 text-sm text-jf-text-secondary">
              <span className="text-jf-text-muted flex-shrink-0 mt-0.5">•</span>
              <span>
                Make sure you reconnected this device to your regular WiFi network after the
                configure step — not the Jellybox-Setup network.
              </span>
            </li>
            <li className="flex gap-2 text-sm text-jf-text-secondary">
              <span className="text-jf-text-muted flex-shrink-0 mt-0.5">•</span>
              <span>
                If the LED is still{' '}
                <span className="text-amber-400 font-medium">amber</span>, the device didn&apos;t
                receive the WiFi credentials. Go back and try configuring again.
              </span>
            </li>
            <li className="flex gap-2 text-sm text-jf-text-secondary">
              <span className="text-jf-text-muted flex-shrink-0 mt-0.5">•</span>
              <span>
                If the LED is flashing red, the WiFi password was incorrect. Go back and
                re-enter your credentials.
              </span>
            </li>
          </ul>

          <div className="flex gap-2">
            <Button onClick={onRetry} variant="secondary" className="flex-1">
              Wait again
            </Button>
            <Link href={`/dashboard/devices/${deviceId}`} className="flex-1">
              <Button variant="secondary" className="w-full">
                Skip to settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-md">
      <CardContent>
        <div className="flex justify-center py-6" aria-hidden>
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-jf-border" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
          </div>
        </div>

        <h2 className="text-base font-semibold text-jf-text-primary text-center mb-1">
          Waiting for Jellybox to connect...
        </h2>
        <p className="text-sm text-jf-text-secondary text-center">
          The device is joining your WiFi and checking in with the server. This usually takes
          about 15 seconds.
        </p>
        <p className="text-sm text-jf-text-secondary text-center mt-2 font-medium">
          Reconnect this phone or laptop to your regular WiFi network now.
        </p>
      </CardContent>
    </Card>
  )
}

// ── Root component ────────────────────────────────────────────────────────

export default function PairDeviceFlow() {
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [device, setDevice] = useState<{ rawKey: string; deviceId: string } | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [pollTimedOut, setPollTimedOut] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [portalReachable, setPortalReachable] = useState(false)

  // Resolve server URL client-side — not available during SSR
  useEffect(() => {
    setServerUrl(window.location.origin)
  }, [])

  // Poll 192.168.4.1 during step 2 to auto-detect the device portal
  useEffect(() => {
    if (step !== 2) return

    let mounted = true

    async function pingPortal() {
      if (!mounted) return
      try {
        const controller = new AbortController()
        const tid = setTimeout(() => controller.abort(), 2000)
        await fetch(PORTAL_ORIGIN, { mode: 'no-cors', signal: controller.signal })
        clearTimeout(tid)
        if (mounted) setPortalReachable(true)
      } catch {
        // not reachable yet — retry on next interval
      }
    }

    pingPortal()
    const interval = setInterval(pingPortal, PORTAL_POLL_MS)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [step])

  // Poll /api/devices/[id]/online once the user reaches the connect step
  useEffect(() => {
    if (step !== 4 || !device || isOnline || pollTimedOut) return

    let mounted = true

    async function poll() {
      if (!mounted || !device) return
      try {
        const res = await fetch(`/api/devices/${device.deviceId}/online`)
        if (!res.ok) return
        const data: { online: boolean } = await res.json()
        if (data.online && mounted) setIsOnline(true)
      } catch {
        // network error — retry on next interval
      }
    }

    poll() // fire immediately, then on interval
    const interval = setInterval(poll, POLL_MS)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      if (mounted) setPollTimedOut(true)
    }, TIMEOUT_MS)

    return () => {
      mounted = false
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [step, device, isOnline, pollTimedOut])

  const goToStep = useCallback((s: Step) => setStep(s), [])

  async function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    const res = await createDeviceAction(new FormData(e.currentTarget))
    setIsPending(false)
    if (res.error) { setError(res.error); return }
    if (!res.rawKey || !res.deviceId) return
    setDevice({ rawKey: res.rawKey, deviceId: res.deviceId })
    setStep(2)
  }

  return (
    <div>
      <PageHeader title="Pair New Device" />
      <StepIndicator current={step} />

      {step === 1 && (
        <StepName isPending={isPending} error={error} onSubmit={handleNameSubmit} />
      )}
      {step === 2 && (
        <StepPowerOn
          portalReachable={portalReachable}
          onNext={() => goToStep(3)}
        />
      )}
      {step === 3 && device && (
        <StepConfigure
          serverUrl={serverUrl}
          apiKey={device.rawKey}
          onNext={() => goToStep(4)}
        />
      )}
      {step === 4 && device && (
        <StepConnecting
          deviceId={device.deviceId}
          isOnline={isOnline}
          timedOut={pollTimedOut}
          onRetry={() => setPollTimedOut(false)}
        />
      )}
    </div>
  )
}
