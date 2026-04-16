import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import AccountSettings from '@/components/account/AccountSettings'
import PlaybackSettings from '@/components/settings/PlaybackSettings'

export const metadata: Metadata = { title: 'Account Settings' }

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      operatingHoursEnabled: true,
      operatingHoursStart: true,
      operatingHoursEnd: true,
      operatingHoursTimezone: true,
      scanDebounceSeconds: true,
    },
  })

  return (
    <div>
      <PageHeader title="Account" description="Manage your profile and account settings." />
      <div className="space-y-10">
        <AccountSettings user={session.user} />

        <div>
          <h2 className="text-base font-semibold text-jf-text-primary mb-5">Playback controls</h2>
          <PlaybackSettings
            operatingHoursEnabled={user?.operatingHoursEnabled ?? false}
            operatingHoursStart={user?.operatingHoursStart ?? null}
            operatingHoursEnd={user?.operatingHoursEnd ?? null}
            operatingHoursTimezone={user?.operatingHoursTimezone ?? null}
            scanDebounceSeconds={user?.scanDebounceSeconds ?? 5}
          />
        </div>
      </div>
    </div>
  )
}
