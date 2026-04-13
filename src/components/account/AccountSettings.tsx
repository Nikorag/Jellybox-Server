'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Session } from 'next-auth'
import { Card, CardContent, CardHeader, Button, Input, ConfirmDialog } from '@/components/ui'
import {
  updateProfileAction,
  changePasswordAction,
  deleteAccountAction,
  clearActivityLogAction,
} from '@/app/dashboard/account/actions'

export default function AccountSettings({ user }: { user: Session['user'] }) {
  const router = useRouter()

  // Profile
  const [name, setName] = useState(user?.name ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Danger zone
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMessage(null)
    const fd = new FormData()
    fd.set('name', name)
    const res = await updateProfileAction(fd)
    setProfileSaving(false)
    if (res.error) setProfileMessage({ type: 'error', text: res.error })
    else setProfileMessage({ type: 'success', text: 'Profile updated.' })
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwSaving(true)
    setPwMessage(null)
    const fd = new FormData()
    fd.set('currentPassword', currentPw)
    fd.set('newPassword', newPw)
    const res = await changePasswordAction(fd)
    setPwSaving(false)
    if (res.error) setPwMessage({ type: 'error', text: res.error })
    else {
      setPwMessage({ type: 'success', text: 'Password changed successfully.' })
      setCurrentPw('')
      setNewPw('')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    await deleteAccountAction()
    await signOut({ callbackUrl: '/' })
  }

  async function handleClearLog() {
    setClearing(true)
    await clearActivityLogAction()
    setClearing(false)
    setClearOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-5 max-w-lg">
      {/* Profile */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-jf-text-primary">Profile</h2></CardHeader>
        <CardContent>
          {profileMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${
              profileMessage.type === 'success'
                ? 'bg-jf-success/10 border-jf-success/30 text-jf-success'
                : 'bg-jf-error/10 border-jf-error/30 text-jf-error'
            }`}>
              {profileMessage.text}
            </div>
          )}
          <form onSubmit={handleProfileSave} className="space-y-4">
            <Input
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email address"
              value={user?.email ?? ''}
              disabled
              helperText="Email cannot be changed."
            />
            <Button type="submit" loading={profileSaving}>Save Profile</Button>
          </form>
        </CardContent>
      </Card>

      {/* Password — only show for credential accounts */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-jf-text-primary">Change Password</h2></CardHeader>
        <CardContent>
          {pwMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm border ${
              pwMessage.type === 'success'
                ? 'bg-jf-success/10 border-jf-success/30 text-jf-success'
                : 'bg-jf-error/10 border-jf-error/30 text-jf-error'
            }`}>
              {pwMessage.text}
            </div>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Input
              label="New password"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              autoComplete="new-password"
              helperText="At least 8 characters."
            />
            <Button type="submit" loading={pwSaving}>Change Password</Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold text-jf-error">Danger Zone</h2></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-jf-text-primary">Clear activity log</p>
              <p className="text-xs text-jf-text-muted">Permanently delete all playback history.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setClearOpen(true)}>Clear Log</Button>
          </div>
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-jf-border">
            <div>
              <p className="text-sm font-medium text-jf-text-primary">Delete account</p>
              <p className="text-xs text-jf-text-muted">Permanently delete your account and all data.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>Delete Account</Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClearLog}
        title="Clear activity log?"
        description="This will permanently delete all playback history. This action cannot be undone."
        confirmLabel="Clear log"
        loading={clearing}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete your account?"
        description="This will permanently delete your account, all devices, tags, and activity history. This action cannot be undone."
        confirmLabel="Delete my account"
        loading={deleting}
      />
    </div>
  )
}
