'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Badge, Button, Modal, Spinner } from '@/components/ui'
import type { MediaItem } from '@/lib/extensions/types'

type Props = {
  open: boolean
  extension: { id: string; name: string }
  onClose: () => void
  onSelect: (item: MediaItem) => void
}

type SearchResponse = { data?: MediaItem[]; error?: string }

export default function ExtensionContentPicker({ open, extension, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSearch('')
      setItems([])
      setError(null)
      return
    }
    if (!search.trim()) {
      setItems([])
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/extensions/${extension.id}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: search }),
          signal: controller.signal,
        })
        const data = (await res.json()) as SearchResponse
        if (!res.ok || !data.data) {
          setError(data.error ?? 'Search failed.')
          setItems([])
        } else {
          setItems(data.data)
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message)
        }
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [search, open, extension.id])

  function imageSrc(item: MediaItem): string | null {
    if (item.imageUrl) return item.imageUrl
    return `/api/extensions/${extension.id}/image?itemId=${encodeURIComponent(item.id)}`
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Search ${extension.name}`}
      description="Find an item to assign to this tag."
      className="max-w-lg"
    >
      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="form-input w-full rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary placeholder:text-jf-text-muted text-sm focus:border-jf-primary focus:ring-jf-primary/30"
        />
      </div>

      <div className="max-h-80 overflow-y-auto space-y-1 -mx-1 px-1">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : error ? (
          <p className="text-sm text-jf-error py-4 text-center">{error}</p>
        ) : !search.trim() ? (
          <p className="text-sm text-jf-text-muted py-4 text-center">Type to search.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-jf-text-muted py-4 text-center">No results.</p>
        ) : (
          items.map((item) => {
            const src = imageSrc(item)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-jf-elevated transition-colors text-left group"
              >
                <div className="w-10 h-14 rounded flex-shrink-0 bg-jf-overlay overflow-hidden relative">
                  {src ? (
                    <Image
                      src={src}
                      alt={item.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-jf-text-muted text-xs">?</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-jf-text-primary truncate group-hover:text-jf-primary transition-colors">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="neutral" className="text-[10px]">{item.type}</Badge>
                    {item.subtitle && (
                      <span className="text-xs text-jf-text-muted truncate">{item.subtitle}</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
