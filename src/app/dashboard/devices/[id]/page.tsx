import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getActiveAccountId } from '@/lib/context'
import { PageHeader } from '@/components/ui'
import DeviceDetail from '@/components/devices/DeviceDetail'
import { getFirmwareManifest } from '@/lib/firmware-manifest'

export const metadata: Metadata = { title: 'Device Settings' }

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const accountId = await getActiveAccountId(session.user.id)

  const device = await db.device.findFirst({
    where: { id, userId: accountId },
    include: { defaultClient: true },
  })
  if (!device) notFound()

  const clients = await db.jellyfinClient.findMany({
    where: { userId: accountId },
    orderBy: { deviceName: 'asc' },
  })

  const manifest = await getFirmwareManifest()
  const latestFirmwareVersion = manifest?.version ?? null

  return (
    <div>
      <PageHeader title={device.name} description="Device settings and API key management." />
      <DeviceDetail
        device={device}
        clients={clients}
        latestFirmwareVersion={latestFirmwareVersion}
      />
    </div>
  )
}
