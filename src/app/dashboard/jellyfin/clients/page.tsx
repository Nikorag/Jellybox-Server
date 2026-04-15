import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { isOwnContext } from '@/lib/context'
import { PageHeader } from '@/components/ui'
import JellyfinClientList from '@/components/jellyfin/JellyfinClientList'

export const metadata: Metadata = { title: 'Jellyfin Clients' }

export default async function JellyfinClientsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  if (!(await isOwnContext(session.user.id))) redirect('/dashboard')

  const server = await db.jellyfinServer.findUnique({
    where: { userId: session.user.id },
  })

  if (!server) redirect('/dashboard/jellyfin')

  const savedClients = await db.jellyfinClient.findMany({
    where: { userId: session.user.id },
    orderBy: { lastSeenAt: 'desc' },
  })

  return (
    <div>
      <PageHeader
        title="Playback Clients"
        description="Manage the Jellyfin clients your devices can play to."
      />
      <JellyfinClientList savedClients={savedClients} />
    </div>
  )
}
