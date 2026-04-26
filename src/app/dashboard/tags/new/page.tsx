import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getActiveAccountId } from '@/lib/context'
import { PageHeader } from '@/components/ui'
import TagForm from '@/components/tags/TagForm'

export const metadata: Metadata = { title: 'Register Tag' }

export default async function NewTagPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const accountId = await getActiveAccountId(session.user.id)

  const [server, devices, connectedExtensions] = await Promise.all([
    db.jellyfinServer.findUnique({
      where: { userId: accountId },
      select: { serverUrl: true },
    }),
    db.device.findMany({
      where: { userId: accountId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
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
      <PageHeader
        title="Register Tag"
        description="Enter the RFID tag ID and give it a label."
      />
      <TagForm
        mode="create"
        jellyfinServerUrl={server?.serverUrl ?? null}
        extensions={extensions}
        devices={devices}
      />
    </div>
  )
}
