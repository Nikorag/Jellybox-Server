'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, Button } from '@/components/ui'
import { saveOperatingHoursAction, saveDebounceAction } from '@/app/dashboard/account/actions'

// Curated list of common IANA timezones
const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Helsinki',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Vienna',
  'Europe/Bucharest',
  'Europe/Athens',
  'Europe/Istanbul',
  'Europe/Moscow',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'America/Bogota',
  'America/Lima',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Hong_Kong',
  'Asia/Karachi',
  'Asia/Tashkent',
  'Asia/Tehran',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Fiji',
]

interface PlaybackSettingsProps {
  operatingHoursEnabled: boolean
  operatingHoursStart: string | null
  operatingHoursEnd: string | null
  operatingHoursTimezone: string | null
  scanDebounceSeconds: number
}

export default function PlaybackSettings({
  operatingHoursEnabled: initialEnabled,
  operatingHoursStart: initialStart,
  operatingHoursEnd: initialEnd,
  operatingHoursTimezone: initialTz,
  scanDebounceSeconds: initialDebounce,
}: PlaybackSettingsProps) {
  // Operating hours
  const [enabled, setEnabled] = useState(initialEnabled)
  const [start, setStart] = useState(initialStart ?? '07:00')
  const [end, setEnd] = useState(initialEnd ?? '21:00')
  const [tz, setTz] = useState(initialTz ?? 'UTC')
  const [hoursSaving, setHoursSaving] = useState(false)
  const [hoursMessage, setHoursMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Debounce
  const [debounce, setDebounce] = useState(initialDebounce)
  const [debounceSaving, setDebounceSaving] = useState(false)
  const [debounceMessage, setDebounceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleHoursSave(e: React.FormEvent) {
    e.preventDefault()
    setHoursSaving(true)
    setHoursMessage(null)
    const res = await saveOperatingHoursAction({
      enabled,
      start: enabled ? start : null,
      end: enabled ? end : null,
      timezone: enabled ? tz : null,
    })
    setHoursSaving(false)
    if (res.error) setHoursMessage({ type: 'error', text: res.error })
    else setHoursMessage({ type: 'success', text: 'Operating hours saved.' })
  }

  async function handleDebounceSave(e: React.FormEvent) {
    e.preventDefault()
    setDebounceSaving(true)
    setDebounceMessage(null)
    const res = await saveDebounceAction(debounce)
    setDebounceSaving(false)
    if (res.error) setDebounceMessage({ type: 'error', text: res.error })
    else setDebounceMessage({ type: 'success', text: 'Debounce period saved.' })
  }

  return (
    <div className="space-y-5">
      {/* Operating hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-jf-text-primary">Operating hours</h2>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-jf-primary focus:ring-offset-2 focus:ring-offset-jf-bg ${
                enabled ? 'bg-jf-primary' : 'bg-jf-border'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                  enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-jf-text-muted mt-1">
            Restrict playback to certain hours of the day. Scans outside this window will be rejected.
          </p>
        </CardHeader>
        <CardContent>
          {hoursMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${
              hoursMessage.type === 'success'
                ? 'bg-jf-success/10 border-jf-success/30 text-jf-success'
                : 'bg-jf-error/10 border-jf-error/30 text-jf-error'
            }`}>
              {hoursMessage.text}
            </div>
          )}
          <form onSubmit={handleHoursSave} className="space-y-4">
            <div className={`space-y-4 transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-jf-text-secondary mb-1.5">Start time</label>
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="form-input w-full rounded-lg border-jf-border bg-jf-elevated text-sm text-jf-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-jf-text-secondary mb-1.5">End time</label>
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="form-input w-full rounded-lg border-jf-border bg-jf-elevated text-sm text-jf-text-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-jf-text-secondary mb-1.5">Timezone</label>
                <select
                  value={tz}
                  onChange={(e) => setTz(e.target.value)}
                  className="form-select w-full rounded-lg border-jf-border bg-jf-elevated text-sm text-jf-text-primary"
                >
                  {TIMEZONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" loading={hoursSaving}>Save</Button>
          </form>
        </CardContent>
      </Card>

      {/* Debounce */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-jf-text-primary">Scan debounce</h2>
          <p className="text-xs text-jf-text-muted mt-1">
            Minimum time between plays. Prevents accidental double-scans.
          </p>
        </CardHeader>
        <CardContent>
          {debounceMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${
              debounceMessage.type === 'success'
                ? 'bg-jf-success/10 border-jf-success/30 text-jf-success'
                : 'bg-jf-error/10 border-jf-error/30 text-jf-error'
            }`}>
              {debounceMessage.text}
            </div>
          )}
          <form onSubmit={handleDebounceSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-jf-text-secondary mb-1.5">
                Grace period: {debounce === 0 ? 'Disabled' : `${debounce}s`}
              </label>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={debounce}
                onChange={(e) => setDebounce(Number(e.target.value))}
                className="w-full accent-jf-primary"
              />
              <div className="flex justify-between text-xs text-jf-text-muted mt-1">
                <span>Off</span>
                <span>30s</span>
              </div>
            </div>
            <Button type="submit" loading={debounceSaving}>Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
