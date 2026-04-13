import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { PageHeader } from '@/components/ui'
import TagForm from '@/components/tags/TagForm'

export const metadata: Metadata = { title: 'Edit Tag' }

export default async function EditTagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const tag = await db.rfidTag.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!tag) notFound()

  const server = await db.jellyfinServer.findUnique({
    where: { userId: session.user.id },
    select: { serverUrl: true },
  })

  return (
    <div>
      <PageHeader title={tag.label} description={`Tag ID: ${tag.tagId}`} />
      <TagForm mode="edit" tag={tag} jellyfinServerUrl={server?.serverUrl ?? null} />
    </div>
  )
}
