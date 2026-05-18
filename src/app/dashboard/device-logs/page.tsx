import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { deviceLogsEnabled, isExtensionsAdmin } from '@/lib/auth-flags'
import { PageHeader } from '@/components/ui'
import DeviceLogsViewer from '@/components/dashboard/DeviceLogsViewer'

export const metadata: Metadata = { title: 'Device logs — Jellybox' }

export default async function DeviceLogsPage() {
  if (!deviceLogsEnabled()) notFound()

  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  if (!isExtensionsAdmin(session.user.email)) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Device logs"
        description="Live UDP log stream forwarded from paired Jellybox devices on your LAN. Nothing is stored — close this page and the lines are gone."
      />
      <DeviceLogsViewer />
    </div>
  )
}
