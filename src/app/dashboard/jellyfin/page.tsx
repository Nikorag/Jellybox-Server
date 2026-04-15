import type { Metadata } from 'next'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { isOwnContext } from '@/lib/context'
import { PageHeader } from '@/components/ui'
import JellyfinStatusCard from '@/components/jellyfin/JellyfinStatusCard'
import JellyfinConnectForm from '@/components/jellyfin/JellyfinConnectForm'

export const metadata: Metadata = { title: 'Jellyfin Settings' }

export default async function JellyfinPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')
  if (!(await isOwnContext(session.user.id))) redirect('/dashboard')

  const server = await db.jellyfinServer.findUnique({
    where: { userId: session.user.id },
  })

  return (
    <div>
      <PageHeader
        title="Jellyfin"
        description="Connect your Jellyfin server to browse your library and trigger playback."
      />

      {server ? (
        <JellyfinStatusCard server={server} />
      ) : (
        <JellyfinConnectForm />
      )}
    </div>
  )
}
