'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface LogLine {
  deviceIp: string
  millis: number | null
  body: string
  receivedAt: number
}

interface Entry extends LogLine {
  id: number
}

const MAX_LINES = 1000

const DEVICE_COLOURS = [
  'text-jf-primary',
  'text-amber-300',
  'text-emerald-300',
  'text-fuchsia-300',
  'text-sky-300',
  'text-rose-300',
  'text-lime-300',
]

function wallClock(ts: number) {
  const d = new Date(ts)
  const pad = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

type Status = 'connecting' | 'open' | 'reconnecting' | 'closed'

export default function DeviceLogsViewer() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [status, setStatus] = useState<Status>('connecting')
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const [follow, setFollow] = useState(true)
  const idRef = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pausedRef = useRef(paused)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const source = new EventSource('/api/device-logs/stream')

    const onOpen = () => setStatus('open')
    const onError = () => setStatus('reconnecting')
    const onLog = (evt: MessageEvent) => {
      if (pausedRef.current) return
      try {
        const line = JSON.parse(evt.data) as LogLine
        setEntries((prev) => {
          const next = prev.concat({ ...line, id: ++idRef.current })
          return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next
        })
      } catch {
        // Drop malformed
      }
    }

    source.addEventListener('open', onOpen)
    source.addEventListener('error', onError)
    source.addEventListener('log', onLog as EventListener)

    return () => {
      source.removeEventListener('open', onOpen)
      source.removeEventListener('error', onError)
      source.removeEventListener('log', onLog as EventListener)
      source.close()
      setStatus('closed')
    }
  }, [])

  // Auto-scroll to bottom on new lines when in follow mode.
  useEffect(() => {
    if (!follow) return
    const el = containerRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [entries, follow])

  const deviceColour = useMemo(() => {
    const map = new Map<string, string>()
    return (ip: string) => {
      let c = map.get(ip)
      if (!c) {
        c = DEVICE_COLOURS[map.size % DEVICE_COLOURS.length]
        map.set(ip, c)
      }
      return c
    }
  }, [])

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase()
    if (!f) return entries
    return entries.filter(
      (e) => e.body.toLowerCase().includes(f) || e.deviceIp.toLowerCase().includes(f),
    )
  }, [entries, filter])

  const knownDevices = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) set.add(e.deviceIp)
    return Array.from(set)
  }, [entries])

  const statusLabel: Record<Status, string> = {
    connecting: 'Connecting…',
    open: 'Live',
    reconnecting: 'Reconnecting…',
    closed: 'Disconnected',
  }
  const statusDotColor: Record<Status, string> = {
    connecting: 'bg-jf-text-muted',
    open: 'bg-emerald-400',
    reconnecting: 'bg-amber-400',
    closed: 'bg-jf-error',
  }
  const statusDotPulse = status === 'connecting' || status === 'reconnecting' || status === 'open'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-jf-surface border border-jf-border"
          role="status"
          aria-live="polite"
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              statusDotColor[status],
              statusDotPulse && 'animate-pulse',
            )}
          />
          <span className="text-xs text-jf-text-secondary">{statusLabel[status]}</span>
        </div>

        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter (text or IP)"
          className="flex-1 min-w-[180px] px-3 py-1.5 rounded-md bg-jf-surface border border-jf-border text-sm text-jf-text-primary placeholder:text-jf-text-muted focus:outline-none focus:border-jf-primary"
        />

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
            paused
              ? 'border-amber-500/50 text-amber-300 bg-amber-500/10'
              : 'border-jf-border text-jf-text-secondary hover:bg-jf-elevated',
          )}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>

        <button
          type="button"
          onClick={() => setFollow((f) => !f)}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
            follow
              ? 'border-jf-primary text-jf-primary bg-jf-primary-muted'
              : 'border-jf-border text-jf-text-secondary hover:bg-jf-elevated',
          )}
          title="Auto-scroll to newest line"
        >
          Follow
        </button>

        <button
          type="button"
          onClick={() => setEntries([])}
          className="px-3 py-1.5 rounded-md text-sm font-medium border border-jf-border text-jf-text-secondary hover:bg-jf-elevated transition-colors"
        >
          Clear
        </button>
      </div>

      {knownDevices.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-jf-text-muted">
          <span>Devices:</span>
          {knownDevices.map((ip) => (
            <span key={ip} className={cn('font-mono', deviceColour(ip))}>{ip}</span>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8
          if (!atBottom && follow) setFollow(false)
        }}
        className="font-mono text-xs bg-black/40 border border-jf-border rounded-lg p-3 h-[60vh] overflow-y-auto"
      >
        {filtered.length === 0 ? (
          entries.length === 0 ? (
            <div className="flex items-center gap-3 text-jf-text-muted">
              <svg
                className="w-4 h-4 animate-spin text-jf-text-muted"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span>
                {status === 'open'
                  ? 'Waiting for log lines from the bridge…'
                  : status === 'reconnecting'
                    ? 'Connection dropped — reconnecting…'
                    : status === 'closed'
                      ? 'Disconnected.'
                      : 'Connecting to the log stream…'}
              </span>
            </div>
          ) : (
            <p className="text-jf-text-muted">No lines match the current filter.</p>
          )
        ) : (
          filtered.map((e) => (
            <div key={e.id} className="whitespace-pre-wrap break-words">
              <span className="text-jf-text-muted">{wallClock(e.receivedAt)}</span>
              {'  '}
              <span className={deviceColour(e.deviceIp)}>{e.deviceIp.padEnd(15)}</span>
              {'  '}
              {e.millis != null && (
                <span className="text-jf-text-muted">
                  [{String(e.millis).padStart(8)}ms]{'  '}
                </span>
              )}
              <span className="text-jf-text-primary">{e.body}</span>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-jf-text-muted">
        Showing {filtered.length}
        {filter ? ` of ${entries.length}` : ''} line{entries.length === 1 ? '' : 's'}. Keeps the
        last {MAX_LINES} in memory; older lines are dropped.
      </p>
    </div>
  )
}
