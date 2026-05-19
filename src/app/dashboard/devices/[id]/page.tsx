import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getActiveAccountId } from '@/lib/context'
import { PageHeader } from '@/components/ui'
import DeviceDetail from '@/components/devices/DeviceDetail'
import { getFirmwareManifest, selectBuild } from '@/lib/firmware-manifest'
import { decrypt } from '@/lib/crypto'
import { jellyfinGetUsers } from '@/lib/jellyfin'

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

  const server = await db.jellyfinServer.findUnique({ where: { userId: accountId } })
  let jellyfinUsers: { Id: string; Name: string }[] = []
  if (server) {
    try {
      const apiToken = decrypt(server.apiToken)
      const customHeaders = server.customHeaders
        ? (() => { try { return JSON.parse(decrypt(server.customHeaders!)) as Record<string, string> } catch { return {} } })()
        : undefined
      jellyfinUsers = await jellyfinGetUsers(server.serverUrl, apiToken, customHeaders)
    } catch {
      jellyfinUsers = []
    }
  }

  const manifest = await getFirmwareManifest()
  const build = selectBuild(manifest, device.sku)
  // Only surface a latest-version pointer if there's actually a build for this
  // device's SKU. Otherwise the dashboard would offer an OTA we can't deliver.
  const latestFirmwareVersion = manifest && build ? manifest.version : null

  return (
    <div>
      <PageHeader title={device.name} description="Device settings and API key management." />
      <DeviceDetail
        device={device}
        clients={clients}
        jellyfinUsers={jellyfinUsers}
        latestFirmwareVersion={latestFirmwareVersion}
      />
    </div>
  )
}
