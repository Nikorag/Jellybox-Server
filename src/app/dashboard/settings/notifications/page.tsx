import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import NotificationsSettings from '@/components/notifications/NotificationsSettings'
import type { ChannelDisplay } from '@/components/notifications/NotificationsSettings'

export const metadata: Metadata = { title: 'Notifications' }

function displayConfig(type: string, encryptedConfig: string): string {
  try {
    const config = JSON.parse(decrypt(encryptedConfig)) as Record<string, string>
    if (type === 'NTFY') {
      const u = new URL(config.url)
      return `${u.host}${u.pathname}`
    }
    const url = config.webhookUrl ?? ''
    const u = new URL(url)
    return `${u.host}…`
  } catch {
    return 'Configured'
  }
}

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const channels = await db.notificationChannel.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  const channelDisplays: ChannelDisplay[] = channels.map((c) => ({
    id: c.id,
    type: c.type,
    label: c.label,
    enabled: c.enabled,
    events: c.events,
    displayConfig: displayConfig(c.type, c.config),
  }))

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Send a push notification to your phone or team when a tag is scanned or playback fails."
      />
      <NotificationsSettings channels={channelDisplays} />
    </div>
  )
}
