'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { RfidTag } from '@prisma/client'
import { Badge, ConfirmDialog } from '@/components/ui'
import { getJellyfinImageUrl } from '@/lib/jellyfin'
import { deleteTagAction } from '@/app/dashboard/tags/actions'
import { truncate } from '@/lib/utils'

const typeBadgeVariant: Record<string, 'primary' | 'info' | 'neutral'> = {
  MOVIE: 'primary',
  SERIES: 'info',
  EPISODE: 'neutral',
  ALBUM: 'neutral',
  PLAYLIST: 'neutral',
}

export default function TagCard({
  tag,
  jellyfinServerUrl,
}: {
  tag: RfidTag
  jellyfinServerUrl: string | null
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const imageUrl =
    jellyfinServerUrl && tag.jellyfinItemId && tag.jellyfinItemImageTag
      ? getJellyfinImageUrl(jellyfinServerUrl, tag.jellyfinItemId, tag.jellyfinItemImageTag, 600)
      : null

  async function handleDelete() {
    setDeleting(true)
    await deleteTagAction(tag.id)
  }

  return (
    <>
      <div className="group relative rounded-xl border border-jf-border bg-jf-surface overflow-hidden hover:border-jf-primary/40 hover:shadow-card-hover transition-all">
        {/* Artwork */}
        <div className="aspect-[2/3] bg-jf-elevated relative">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={tag.jellyfinItemTitle ?? tag.label}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-jf-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          )}

          {/* Hover actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Link
              href={`/dashboard/tags/${tag.id}`}
              className="px-3 py-1.5 rounded-md bg-jf-primary text-white text-xs font-medium hover:bg-jf-primary-hover transition-colors"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="px-3 py-1.5 rounded-md bg-jf-error/80 text-white text-xs font-medium hover:bg-jf-error transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-medium text-jf-text-primary truncate mb-0.5">
            {truncate(tag.label, 30)}
          </p>
          {tag.jellyfinItemTitle ? (
            <p className="text-xs text-jf-text-muted truncate mb-1.5">{truncate(tag.jellyfinItemTitle, 28)}</p>
          ) : (
            <p className="text-xs text-jf-warning mb-1.5">No content assigned</p>
          )}
          <div className="flex items-center justify-between">
            <code className="text-xs text-jf-text-muted font-mono">{tag.tagId.slice(0, 8)}</code>
            {tag.jellyfinItemType && (
              <Badge variant={typeBadgeVariant[tag.jellyfinItemType] ?? 'neutral'} className="text-[10px]">
                {tag.jellyfinItemType}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete tag?"
        description={`This will permanently delete "${tag.label}" and its content assignment.`}
        confirmLabel="Delete tag"
        loading={deleting}
      />
    </>
  )
}
