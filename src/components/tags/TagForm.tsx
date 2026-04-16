'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { RfidTag } from '@prisma/client'
import { Button, Input, Card, CardContent, Spinner } from '@/components/ui'
import ContentPicker from './ContentPicker'
import { createTagAction, updateTagAction } from '@/app/dashboard/tags/actions'
import type { JellyfinItem } from '@/lib/jellyfin'

interface TagFormProps {
  mode: 'create' | 'edit'
  tag?: RfidTag
  jellyfinServerUrl?: string | null
  devices?: { id: string; name: string }[]
}

type ScanState =
  | { status: 'idle' }
  | { status: 'scanning'; token: string; expiresAt: Date; deviceName: string }
  | { status: 'captured'; tagId: string }
  | { status: 'expired' }

const POLL_INTERVAL_MS = 2000

export default function TagForm({ mode, tag, jellyfinServerUrl, devices = [] }: TagFormProps) {
  const router = useRouter()
  const [label, setLabel] = useState(tag?.label ?? '')
  const [tagId, setTagId] = useState(tag?.tagId ?? '')
  const [selectedItem, setSelectedItem] = useState<JellyfinItem | null>(
    tag?.jellyfinItemId
      ? {
          Id: tag.jellyfinItemId,
          Name: tag.jellyfinItemTitle ?? '',
          Type: 'Movie',
          ImageTags: tag.jellyfinItemImageTag ? { Primary: tag.jellyfinItemImageTag } : undefined,
        }
      : null,
  )
  const [resumePlayback, setResumePlayback] = useState(tag?.resumePlayback ?? false)
  const [shuffle, setShuffle] = useState(tag?.shuffle ?? false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Scan mode state
  const [scanState, setScanState] = useState<ScanState>({ status: 'idle' })
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id ?? '')
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Poll for captured tag ID
  useEffect(() => {
    if (scanState.status !== 'scanning') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/scan-mode?token=${scanState.token}`)
        const data = await res.json() as { status: string; tagId?: string }

        if (data.status === 'captured' && data.tagId) {
          setTagId(data.tagId)
          setScanState({ status: 'captured', tagId: data.tagId })
        } else if (data.status === 'expired') {
          setScanState({ status: 'expired' })
        } else {
          // still pending — check expiry client-side too
          if (new Date() >= scanState.expiresAt) {
            setScanState({ status: 'expired' })
          } else {
            pollRef.current = setTimeout(poll, POLL_INTERVAL_MS)
          }
        }
      } catch {
        pollRef.current = setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    pollRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [scanState])

  // Cancel scan mode on unmount
  useEffect(() => {
    return () => {
      if (scanState.status === 'scanning') {
        fetch(`/api/scan-mode?token=${scanState.token}`, { method: 'DELETE' })
      }
    }
  }, [scanState])

  async function startScanMode() {
    const device = devices.find((d) => d.id === selectedDeviceId)
    if (!device) return
    setScanState({ status: 'idle' }) // reset any previous state
    setError(null)

    const res = await fetch('/api/scan-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.id }),
    })
    const text = await res.text()
    let data: { token?: string; expiresAt?: string; error?: string } = {}
    try { data = JSON.parse(text) } catch { /* empty body from server crash */ }

    if (!res.ok || !data.token) {
      setError(data.error ?? 'Failed to start scan mode.')
      return
    }

    setScanState({
      status: 'scanning',
      token: data.token,
      expiresAt: new Date(data.expiresAt!),
      deviceName: device.name,
    })
  }

  function cancelScanMode() {
    if (scanState.status === 'scanning') {
      fetch(`/api/scan-mode?token=${scanState.token}`, { method: 'DELETE' })
    }
    setScanState({ status: 'idle' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const fd = new FormData()
    fd.set('label', label)
    fd.set('tagId', tagId)
    if (selectedItem) {
      fd.set('jellyfinItemId', selectedItem.Id)
      fd.set('jellyfinItemType', selectedItem.Type.toUpperCase())
      fd.set('jellyfinItemTitle', selectedItem.Name)
      fd.set('jellyfinItemImageTag', selectedItem.ImageTags?.Primary ?? '')
    }
    fd.set('resumePlayback', String(resumePlayback))
    fd.set('shuffle', String(shuffle))

    const res =
      mode === 'create'
        ? await createTagAction(fd)
        : await updateTagAction(tag!.id, fd)

    setIsPending(false)

    if (res.error) {
      setError(res.error)
      return
    }

    router.push('/dashboard/tags')
    router.refresh()
  }

  function handleClearContent() {
    setSelectedItem(null)
  }

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId)

  return (
    <>
      <Card className="max-w-md">
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tag ID field + scan mode */}
            <div className="space-y-2">
              <Input
                label="Tag ID"
                value={tagId}
                onChange={(e) => setTagId(e.target.value)}
                required
                placeholder="e.g. A1B2C3D4"
                helperText="The hardware UID printed on the tag."
                disabled={mode === 'edit' || scanState.status === 'scanning'}
              />

              {mode === 'create' && devices.length > 0 && (
                <div className="rounded-lg border border-jf-border bg-jf-elevated p-3 space-y-2">
                  {scanState.status === 'idle' || scanState.status === 'expired' || scanState.status === 'captured' ? (
                    <>
                      {scanState.status === 'expired' && (
                        <p className="text-xs text-jf-error">Scan timed out — try again.</p>
                      )}
                      {scanState.status === 'captured' && (
                        <p className="text-xs text-jf-primary">Tag captured: {scanState.tagId}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedDeviceId}
                          onChange={(e) => setSelectedDeviceId(e.target.value)}
                          className="form-select flex-1 rounded-md bg-jf-overlay border-jf-border text-jf-text-primary text-xs focus:border-jf-primary focus:ring-jf-primary/30"
                        >
                          {devices.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={startScanMode}
                          disabled={!selectedDeviceId}
                        >
                          Scan from device
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* scanning */
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" />
                        <span className="text-xs text-jf-text-secondary">
                          Waiting for scan on <span className="text-jf-text-primary font-medium">{scanState.deviceName}</span>…
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={cancelScanMode}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Input
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="e.g. The Lion King disc"
              helperText="A friendly name to identify this tag."
            />

            {/* Content assignment */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-jf-text-secondary">
                Jellyfin content
              </label>
              {selectedItem ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-jf-elevated border border-jf-border">
                  <span className="text-sm text-jf-text-primary truncate">{selectedItem.Name}</span>
                  <div className="flex gap-1.5">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
                      Change
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handleClearContent}>
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPickerOpen(true)}
                  disabled={!jellyfinServerUrl}
                >
                  {jellyfinServerUrl ? 'Browse library…' : 'Link Jellyfin first'}
                </Button>
              )}
            </div>

            {/* Playback options — only shown when content is selected */}
            {selectedItem && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-jf-text-secondary">Playback options</p>
                <div className="rounded-lg border border-jf-border bg-jf-elevated p-3 space-y-3">
                  {/* Resume — only meaningful for series */}
                  {selectedItem.Type === 'Series' && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resumePlayback}
                        onChange={(e) => setResumePlayback(e.target.checked)}
                        className="mt-0.5 rounded accent-jf-primary"
                      />
                      <div>
                        <p className="text-sm text-jf-text-primary leading-snug">Resume from next episode</p>
                        <p className="text-xs text-jf-text-muted">Plays the next unwatched episode instead of a random one.</p>
                      </div>
                    </label>
                  )}
                  {/* Shuffle */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffle}
                      onChange={(e) => setShuffle(e.target.checked)}
                      className="mt-0.5 rounded accent-jf-primary"
                    />
                    <div>
                      <p className="text-sm text-jf-text-primary leading-snug">Shuffle</p>
                      <p className="text-xs text-jf-text-muted">
                        {selectedItem.Type === 'Series'
                          ? 'Pick a random episode each time.'
                          : 'Start playback in shuffle mode.'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                {mode === 'create' ? 'Register Tag' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {jellyfinServerUrl && (
        <ContentPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            setSelectedItem(item)
            setPickerOpen(false)
          }}
        />
      )}
    </>
  )
}
