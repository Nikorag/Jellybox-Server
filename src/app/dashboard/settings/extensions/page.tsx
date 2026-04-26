import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isExtensionsAdmin } from '@/lib/auth-flags'
import { PageHeader } from '@/components/ui'
import ExtensionsSettings, {
  type ExtensionListItem,
} from '@/components/extensions/ExtensionsSettings'
import type { ExtensionManifest } from '@/lib/extensions/types'

export const metadata: Metadata = { title: 'Extensions' }

export default async function ExtensionsSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  // System-wide list — every signed-in user sees the same set of extensions.
  // Each user's own ExtensionAccount (if any) is included so they see their
  // personal connection state, not someone else's.
  const rows = await db.extension.findMany({
    orderBy: { createdAt: 'asc' },
    include: { accounts: { where: { userId: session.user.id } } },
  })

  const isAdmin = isExtensionsAdmin(session.user.email)

  const initial: ExtensionListItem[] = rows.map((r) => {
    const own = r.accounts[0] ?? null
    return {
      id: r.id,
      name: r.name,
      baseUrl: r.baseUrl,
      manifest: r.manifest as unknown as ExtensionManifest,
      enabled: r.enabled,
      account: own
        ? { displayName: own.displayName, defaultClientId: own.defaultClientId }
        : null,
    }
  })

  return (
    <div>
      <PageHeader
        title="Extensions"
        description={
          isAdmin
            ? 'Register third-party HTTP extensions (Lambda or self-hosted) so every user on this Jellybox can connect their own account. See examples/extension-reference for a working starter.'
            : 'Connect your own account to extensions an administrator has set up. Each connected extension lets you assign tags to media outside Jellyfin.'
        }
      />
      <ExtensionsSettings initial={initial} isAdmin={isAdmin} />
    </div>
  )
}
