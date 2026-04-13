import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { PageHeader, Button } from '@/components/ui'
import TagGrid from '@/components/tags/TagGrid'

export const metadata: Metadata = { title: 'RFID Tags' }

export default async function TagsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const tags = await db.rfidTag.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  const server = await db.jellyfinServer.findUnique({
    where: { userId: session.user.id },
    select: { serverUrl: true },
  })

  return (
    <div>
      <PageHeader
        title="RFID Tags"
        description="Assign your physical RFID tags to content from your Jellyfin library."
        action={
          <Link href="/dashboard/tags/new">
            <Button size="sm">Register Tag</Button>
          </Link>
        }
      />
      <TagGrid tags={tags} jellyfinServerUrl={server?.serverUrl ?? null} />
    </div>
  )
}
