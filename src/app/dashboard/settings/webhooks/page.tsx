import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import WebhooksSettings from '@/components/settings/WebhooksSettings'

export const metadata: Metadata = { title: 'Webhooks' }

export default async function WebhooksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const webhooks = await db.webhook.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Call external URLs when Jellyfin is offline. Useful for Home Assistant automations that power on your TV or wake your Jellyfin server before playback is retried."
      />
      <WebhooksSettings webhooks={webhooks} />
    </div>
  )
}
