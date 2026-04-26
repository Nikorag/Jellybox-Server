import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getActiveAccountId } from '@/lib/context'
import { PageHeader } from '@/components/ui'
import TagForm from '@/components/tags/TagForm'

export const metadata: Metadata = { title: 'Edit Tag' }

export default async function EditTagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const accountId = await getActiveAccountId(session.user.id)

  const tag = await db.rfidTag.findFirst({
    where: { id, userId: accountId },
  })
  if (!tag) notFound()

  const [server, connectedExtensions] = await Promise.all([
    db.jellyfinServer.findUnique({
      where: { userId: accountId },
      select: { serverUrl: true },
    }),
    db.extensionAccount.findMany({
      where: { userId: accountId },
      select: { extension: { select: { id: true, name: true } } },
      orderBy: { extension: { name: 'asc' } },
    }),
  ])

  const extensions = connectedExtensions.map((row) => row.extension)

  return (
    <div>
      <PageHeader title={tag.label} description={`Tag ID: ${tag.tagId}`} />
      <TagForm
        mode="edit"
        tag={tag}
        jellyfinServerUrl={server?.serverUrl ?? null}
        extensions={extensions}
      />
    </div>
  )
}
