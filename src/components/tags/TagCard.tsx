'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { RfidTag } from '@prisma/client'
import { PlayCircle, Shuffle, Tag } from 'lucide-react'
import { Badge, ConfirmDialog } from '@/components/ui'
import { deleteTagAction, triggerTagAction } from '@/app/dashboard/tags/actions'
import { truncate } from '@/lib/utils'

const typeBadgeVariant: Record<string, 'primary' | 'info' | 'neutral'> = {
  MOVIE: 'primary',
  SERIES: 'info',
  EPISODE: 'neutral',
  ALBUM: 'neutral',
  PLAYLIST: 'neutral',
}

export default function TagCard({ tag, priority = false }: { tag: RfidTag; priority?: boolean }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [triggerOpen, setTriggerOpen] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Auto-dismiss the success/error toast after 4s.
  useEffect(() => {
    if (!feedback) return
    const t = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(t)
  }, [feedback])

  const hasContent = !!tag.jellyfinItemId || !!tag.extensionId

  // Images are proxied through Jellybox so the request is authenticated and
  // any custom upstream headers are forwarded. For extension tags, prefer the
  // direct URL captured at assignment time — extensions that don't implement
  // /image (e.g. ones that hand back public CDN URLs) won't 404 that way.
  const imageUrl = tag.jellyfinItemId && tag.jellyfinItemImageTag
    ? `/api/jellyfin/image?itemId=${tag.jellyfinItemId}&tag=${tag.jellyfinItemImageTag}&width=600`
    : tag.externalItemImageUrl
      ? tag.externalItemImageUrl
      : tag.extensionId && tag.externalItemId
        ? `/api/extensions/${tag.extensionId}/image?itemId=${encodeURIComponent(tag.externalItemId)}`
        : null

  const itemTitle = tag.jellyfinItemTitle ?? tag.externalItemTitle ?? null
  const itemTypeBadge = tag.jellyfinItemType ?? tag.externalItemType ?? null

  async function handleDelete() {
    setDeleting(true)
    await deleteTagAction(tag.id)
  }

  async function handleTrigger() {
    setTriggering(true)
    const res = await triggerTagAction(tag.id)
    setTriggering(false)
    setTriggerOpen(false)
    if (res.error) {
      setFeedback({ kind: 'error', text: res.error })
    } else {
      setFeedback({ kind: 'success', text: res.content ? `Playing "${res.content}"` : 'Triggered' })
    }
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
              priority={priority}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Tag className="w-10 h-10 text-jf-text-muted" strokeWidth={1} />
            </div>
          )}

          {/* Hover actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={!hasContent || triggering}
              onClick={() => setTriggerOpen(true)}
              title={hasContent ? 'Trigger playback now' : 'No content assigned'}
              className="px-3 py-1.5 rounded-md bg-jf-success text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trigger
            </button>
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

          {/* Trigger feedback toast — sits over the artwork briefly */}
          {feedback && (
            <div
              className={`absolute inset-x-2 top-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium shadow-md ${
                feedback.kind === 'success'
                  ? 'bg-jf-success text-white'
                  : 'bg-jf-error text-white'
              }`}
              role="status"
            >
              {truncate(feedback.text, 60)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-medium text-jf-text-primary truncate mb-0.5">
            {truncate(tag.label, 30)}
          </p>
          {itemTitle ? (
            <p className="text-xs text-jf-text-muted truncate mb-1.5">{truncate(itemTitle, 28)}</p>
          ) : (
            <p className="text-xs text-jf-warning mb-1.5">No content assigned</p>
          )}
          <div className="flex items-center justify-between">
            <code className="text-xs text-jf-text-muted font-mono">{tag.tagId.slice(0, 8)}</code>
            <div className="flex items-center gap-1.5">
              {tag.resumePlayback && (
                <span title="Resumes from next episode" className="text-jf-primary">
                  <PlayCircle className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
              )}
              {tag.shuffle && (
                <span title="Shuffle" className="text-jf-primary">
                  <Shuffle className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
              )}
              {itemTypeBadge && (
                <Badge variant={typeBadgeVariant[itemTypeBadge.toUpperCase()] ?? 'neutral'} className="text-[10px]">
                  {itemTypeBadge}
                </Badge>
              )}
            </div>
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

      <ConfirmDialog
        open={triggerOpen}
        onClose={() => setTriggerOpen(false)}
        onConfirm={handleTrigger}
        title="Trigger playback?"
        description={`Play "${tag.jellyfinItemTitle ?? tag.externalItemTitle ?? tag.label}" now on your default playback target.`}
        confirmLabel="Trigger"
        loading={triggering}
      />
    </>
  )
}
