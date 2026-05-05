'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Device, JellyfinClient } from '@prisma/client'
import { Card, CardContent, CardHeader, Button, Input, ConfirmDialog, Badge } from '@/components/ui'
import {
  updateDeviceAction,
  deleteDeviceAction,
  setFirmwareUpdatePendingAction,
} from '@/app/dashboard/devices/actions'
import { formatRelativeTime, formatDate } from '@/lib/utils'

type DeviceWithClient = Device & { defaultClient: JellyfinClient | null }

export default function DeviceDetail({
  device,
  clients,
  latestFirmwareVersion,
}: {
  device: DeviceWithClient
  clients: JellyfinClient[]
  latestFirmwareVersion: string | null
}) {
  const router = useRouter()
  const [name, setName] = useState(device.name)
  const [defaultClientId, setDefaultClientId] = useState(device.defaultClientId ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [firmwareBusy, setFirmwareBusy] = useState(false)
  const updateAvailable =
    !!latestFirmwareVersion &&
    !!device.firmwareVersion &&
    latestFirmwareVersion !== device.firmwareVersion

  async function setUpdatePending(pending: boolean) {
    setFirmwareBusy(true)
    await setFirmwareUpdatePendingAction(device.id, pending)
    setFirmwareBusy(false)
    router.refresh()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const fd = new FormData()
    fd.set('name', name)
    if (defaultClientId) fd.set('defaultClientId', defaultClientId)
    const res = await updateDeviceAction(device.id, fd)
    setSaving(false)
    if (res.error) setSaveError(res.error)
    else router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    await deleteDeviceAction(device.id)
    router.push('/dashboard/devices')
  }

  return (
    <div className="space-y-5 max-w-lg">
      {/* Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-jf-text-primary">Settings</h2>
        </CardHeader>
        <CardContent>
          {saveError && (
            <div className="mb-4 p-3 rounded-lg bg-jf-error/10 border border-jf-error/30 text-jf-error text-sm">
              {saveError}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Device name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-jf-text-secondary">
                Default Jellyfin client
              </label>
              <select
                value={defaultClientId}
                onChange={(e) => setDefaultClientId(e.target.value)}
                className="form-select w-full rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary text-sm focus:border-jf-primary focus:ring-jf-primary/30"
              >
                <option value="">— None —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.deviceName}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" loading={saving}>Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-jf-text-primary">Status</h2>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-jf-text-muted">Last seen</span>
            <span className="text-jf-text-primary">
              {device.lastSeenAt ? formatRelativeTime(device.lastSeenAt) : 'Never'}
            </span>
          </div>
          {device.firmwareVersion && (
            <div className="flex justify-between">
              <span className="text-jf-text-muted">Firmware</span>
              <span className="text-jf-text-primary">v{device.firmwareVersion}</span>
            </div>
          )}
          {latestFirmwareVersion && (
            <div className="flex justify-between">
              <span className="text-jf-text-muted">Latest available</span>
              <span className="text-jf-text-primary">{latestFirmwareVersion}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-jf-text-muted">Added</span>
            <span className="text-jf-text-primary">{formatDate(device.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Firmware */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-jf-text-primary">Firmware</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {device.firmwareUpdatePending ? (
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Update pending</Badge>
                </div>
                <p className="text-xs text-jf-text-muted">
                  The device will install {latestFirmwareVersion ?? 'the latest firmware'} on its
                  next check-in.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={firmwareBusy}
                onClick={() => setUpdatePending(false)}
              >
                Cancel
              </Button>
            </div>
          ) : updateAvailable ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-jf-text-primary">Update available</p>
                <p className="text-xs text-jf-text-muted">
                  {device.firmwareVersion} → {latestFirmwareVersion}
                </p>
              </div>
              <Button
                size="sm"
                loading={firmwareBusy}
                onClick={() => setUpdatePending(true)}
              >
                Update firmware
              </Button>
            </div>
          ) : (
            <p className="text-sm text-jf-text-muted">
              {device.firmwareVersion
                ? 'Device is running the latest firmware.'
                : 'Waiting for the device to report its firmware version.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-jf-error">Danger Zone</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-jf-text-primary">Remove device</p>
              <p className="text-xs text-jf-text-muted">Permanently remove this device and revoke its key.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Remove device?"
        description="This will permanently remove this device and revoke its API key. Playback requests from this device will stop working immediately."
        confirmLabel="Remove device"
        loading={deleting}
      />
    </div>
  )
}
