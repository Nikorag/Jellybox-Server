import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getActiveAccountId } from '@/lib/context'
import { PageHeader } from '@/components/ui'
import StickerSheetClient, { type PrefillSticker } from './StickerSheetClient'

export const metadata: Metadata = { title: 'Sticker Sheet' }

export default async function StickerSheetPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const accountId = await getActiveAccountId(session.user.id)

  const tags = await db.rfidTag.findMany({
    where: { userId: accountId },
    orderBy: { createdAt: 'desc' },
  })

  const prefill: PrefillSticker[] = tags.map((tag) => {
    let logoUrl: string | null = null
    if (tag.jellyfinItemId && tag.jellyfinItemImageTag) {
      logoUrl = `/api/jellyfin/image?itemId=${tag.jellyfinItemId}&tag=${tag.jellyfinItemImageTag}&width=600`
    } else if (tag.externalItemImageUrl) {
      logoUrl = tag.externalItemImageUrl
    } else if (tag.extensionId && tag.externalItemId) {
      logoUrl = `/api/extensions/${tag.extensionId}/image?itemId=${encodeURIComponent(tag.externalItemId)}`
    }

    return {
      id: tag.id,
      title: tag.label,
      logoUrl,
    }
  })

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title="Sticker Sheet"
          description="Print credit-card-sized stickers for your tags."
        />
      </div>
      <StickerSheetClient prefill={prefill} />
    </div>
  )
}
