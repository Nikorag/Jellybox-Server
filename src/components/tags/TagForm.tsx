'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { RfidTag } from '@prisma/client'
import { Button, Input, Card, CardContent, Spinner } from '@/components/ui'
import ContentPicker from './ContentPicker'
import ExtensionContentPicker from './ExtensionContentPicker'
import { createTagAction, updateTagAction } from '@/app/dashboard/tags/actions'
import type { JellyfinItem } from '@/lib/jellyfin'
import type { MediaItem } from '@/lib/extensions/types'

export type TagFormExtension = { id: string; name: string }

interface TagFormProps {
  mode: 'create' | 'edit'
  tag?: RfidTag
  jellyfinServerUrl?: string | null
  /// Connected extensions the user can assign content from. Empty when no
  /// extensions are connected for this account.
  extensions?: TagFormExtension[]
  devices?: { id: string; name: string }[]
}

type ScanState =
  | { status: 'idle' }
  | { status: 'scanning'; token: string; expiresAt: Date; deviceName: string }
  | { status: 'captured'; tagId: string }
  | { status: 'expired' }

type Assignment =
  | { source: 'none' }
  | { source: 'jellyfin'; item: JellyfinItem }
  | { source: 'extension'; extensionId: string; item: MediaItem }

const POLL_INTERVAL_MS = 2000

function initialAssignment(tag?: RfidTag): Assignment {
  if (tag?.jellyfinItemId) {
    return {
      source: 'jellyfin',
      item: {
        Id: tag.jellyfinItemId,
        Name: tag.jellyfinItemTitle ?? '',
        Type: (tag.jellyfinItemType ?? 'Movie') as JellyfinItem['Type'],
        ImageTags: tag.jellyfinItemImageTag ? { Primary: tag.jellyfinItemImageTag } : undefined,
      },
    }
  }
  if (tag?.extensionId && tag.externalItemId) {
    return {
      source: 'extension',
      extensionId: tag.extensionId,
      item: {
        id: tag.externalItemId,
        title: tag.externalItemTitle ?? '',
        type: tag.externalItemType ?? 'item',
      },
    }
  }
  return { source: 'none' }
}

function initialSourceKey(assignment: Assignment, jellyfinUrl: string | null | undefined, extensions: TagFormExtension[]): string {
  if (assignment.source === 'jellyfin') return 'jellyfin'
  if (assignment.source === 'extension') return `extension:${assignment.extensionId}`
  // Default: prefer Jellyfin if linked, else first extension, else nothing.
  if (jellyfinUrl) return 'jellyfin'
  if (extensions[0]) return `extension:${extensions[0].id}`
  return ''
}

export default function TagForm({
  mode,
  tag,
  jellyfinServerUrl,
  extensions = [],
  devices = [],
}: TagFormProps) {
  const router = useRouter()
  const [label, setLabel] = useState(tag?.label ?? '')
  const [tagId, setTagId] = useState(tag?.tagId ?? '')
  const [assignment, setAssignment] = useState<Assignment>(() => initialAssignment(tag))
  const [sourceKey, setSourceKey] = useState<string>(() =>
    initialSourceKey(initialAssignment(tag), jellyfinServerUrl, extensions),
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
    setScanState({ status: 'idle' })
    setError(null)

    const res = await fetch('/api/scan-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: device.id }),
    })
    const text = await res.text()
    let data: { token?: string; expiresAt?: string; error?: string } = {}
    try { data = JSON.parse(text) } catch { /* server crash */ }

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

  function changeSource(next: string) {
    setSourceKey(next)
    setAssignment({ source: 'none' })
  }

  function clearAssignment() {
    setAssignment({ source: 'none' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const fd = new FormData()
    fd.set('label', label)
    fd.set('tagId', tagId)

    if (assignment.source === 'jellyfin') {
      fd.set('jellyfinItemId', assignment.item.Id)
      fd.set('jellyfinItemType', assignment.item.Type.toUpperCase())
      fd.set('jellyfinItemTitle', assignment.item.Name)
      fd.set('jellyfinItemImageTag', assignment.item.ImageTags?.Primary ?? '')
    } else if (assignment.source === 'extension') {
      fd.set('extensionId', assignment.extensionId)
      fd.set('externalItemId', assignment.item.id)
      fd.set('externalItemType', assignment.item.type)
      fd.set('externalItemTitle', assignment.item.title)
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

  // Derived helpers for rendering
  const activeExtension =
    sourceKey.startsWith('extension:')
      ? extensions.find((e) => `extension:${e.id}` === sourceKey)
      : undefined
  const isJellyfinSource = sourceKey === 'jellyfin'
  const noSourcesAvailable = !jellyfinServerUrl && extensions.length === 0
  const selectedTitle =
    assignment.source === 'jellyfin'
      ? assignment.item.Name
      : assignment.source === 'extension'
        ? assignment.item.title
        : null

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
            {/* Tag ID + scan mode */}
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
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" />
                        <span className="text-xs text-jf-text-secondary">
                          Waiting for scan on <span className="text-jf-text-primary font-medium">{scanState.deviceName}</span>…
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={cancelScanMode}>
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
              <label className="text-sm font-medium text-jf-text-secondary">Content</label>

              {noSourcesAvailable ? (
                <p className="text-xs text-jf-warning">
                  Link Jellyfin or connect an extension to assign content.
                </p>
              ) : (
                <>
                  {/* Source picker — only shown when there are choices */}
                  {(jellyfinServerUrl ? 1 : 0) + extensions.length > 1 && (
                    <select
                      value={sourceKey}
                      onChange={(e) => changeSource(e.target.value)}
                      className="form-select rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary text-sm focus:border-jf-primary focus:ring-jf-primary/30"
                    >
                      {jellyfinServerUrl && <option value="jellyfin">Jellyfin</option>}
                      {extensions.map((ext) => (
                        <option key={ext.id} value={`extension:${ext.id}`}>{ext.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Selected item display + browse trigger */}
                  {selectedTitle ? (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-jf-elevated border border-jf-border">
                      <span className="text-sm text-jf-text-primary truncate">{selectedTitle}</span>
                      <div className="flex gap-1.5">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
                          Change
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={clearAssignment}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPickerOpen(true)}
                      disabled={!isJellyfinSource && !activeExtension}
                    >
                      {isJellyfinSource ? 'Browse Jellyfin library…' : `Search ${activeExtension?.name ?? '…'}`}
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Playback options — context-aware */}
            {assignment.source !== 'none' && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-jf-text-secondary">Playback options</p>
                <div className="rounded-lg border border-jf-border bg-jf-elevated p-3 space-y-3">
                  {/* Resume — Jellyfin Series only */}
                  {assignment.source === 'jellyfin' && assignment.item.Type === 'Series' && (
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
                        {assignment.source === 'jellyfin' && assignment.item.Type === 'Series'
                          ? 'Pick a random episode each time.'
                          : assignment.source === 'extension'
                            ? 'Forwarded to the extension as a flag.'
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

      {/* Pickers — only one open at a time, gated on sourceKey */}
      {jellyfinServerUrl && isJellyfinSource && (
        <ContentPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            setAssignment({ source: 'jellyfin', item })
            setPickerOpen(false)
          }}
        />
      )}
      {activeExtension && (
        <ExtensionContentPicker
          open={pickerOpen}
          extension={activeExtension}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            setAssignment({ source: 'extension', extensionId: activeExtension.id, item })
            setPickerOpen(false)
          }}
        />
      )}
    </>
  )
}
