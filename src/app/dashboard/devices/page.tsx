import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { PageHeader, Button, EmptyState } from '@/components/ui'
import DeviceCard from '@/components/devices/DeviceCard'

export const metadata: Metadata = { title: 'Devices' }

export default async function DevicesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const devices = await db.device.findMany({
    where: { userId: session.user.id },
    include: { defaultClient: true },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <PageHeader
        title="Devices"
        description="Manage your paired Jellybox devices."
        action={
          <Link href="/dashboard/devices/pair">
            <Button size="sm">Pair Device</Button>
          </Link>
        }
      />

      {devices.length === 0 ? (
        <EmptyState
          title="No devices paired"
          description="Pair your first Jellybox device to get started. You'll be given an API key to enter into the device firmware."
          action={
            <Link href="/dashboard/devices/pair">
              <Button>Pair your first device</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  )
}
