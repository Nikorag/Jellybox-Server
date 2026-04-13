'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Modal, Spinner, Badge, Button } from '@/components/ui'
import type { JellyfinItem, JellyfinItemType } from '@/lib/jellyfin'
import { JELLYFIN_LIBRARY_PAGE_SIZE } from '@/lib/constants'

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'Movie', label: 'Movies' },
  { value: 'Series', label: 'Series' },
  { value: 'MusicAlbum', label: 'Albums' },
  { value: 'Playlist', label: 'Playlists' },
]

interface LibraryResponse {
  data?: { Items: JellyfinItem[]; TotalRecordCount: number }
  error?: string
}

export default function ContentPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (item: JellyfinItem) => void
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [items, setItems] = useState<JellyfinItem[]>([])
  const [total, setTotal] = useState(0)
  const [startIndex, setStartIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(
    async (reset = false) => {
      setLoading(true)
      setError(null)
      const idx = reset ? 0 : startIndex
      const params = new URLSearchParams({
        startIndex: String(idx),
        limit: String(JELLYFIN_LIBRARY_PAGE_SIZE),
      })
      if (search) params.set('search', search)
      if (typeFilter) params.set('types', typeFilter)

      const res = await fetch(`/api/jellyfin/library?${params}`)
      const data = (await res.json()) as LibraryResponse
      setLoading(false)

      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to load library.')
        return
      }

      if (data.data) {
        setItems(reset ? data.data.Items : (prev) => [...prev, ...data.data!.Items])
        setTotal(data.data.TotalRecordCount)
        if (reset) setStartIndex(JELLYFIN_LIBRARY_PAGE_SIZE)
        else setStartIndex((prev) => prev + JELLYFIN_LIBRARY_PAGE_SIZE)
      }
    },
    [search, typeFilter, startIndex],
  )

  // Reload when filters change
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => fetchItems(true), 300)
    return () => clearTimeout(timer)
  }, [search, typeFilter, open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearch('')
      setTypeFilter('')
      setItems([])
      setStartIndex(0)
    }
  }, [open])

  const hasMore = items.length < total

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pick content"
      description="Search your Jellyfin library and select an item to assign."
      className="max-w-lg"
    >
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="form-input flex-1 rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary placeholder:text-jf-text-muted text-sm focus:border-jf-primary focus:ring-jf-primary/30"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="form-select rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary text-sm focus:border-jf-primary focus:ring-jf-primary/30"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="max-h-80 overflow-y-auto space-y-1 -mx-1 px-1">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : error ? (
          <p className="text-sm text-jf-error py-4 text-center">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-jf-text-muted py-4 text-center">No results found.</p>
        ) : (
          <>
            {items.map((item) => (
              <button
                key={item.Id}
                type="button"
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-jf-elevated transition-colors text-left group"
              >
                <div className="w-10 h-14 rounded flex-shrink-0 bg-jf-overlay overflow-hidden relative">
                  {item.ImageTags?.Primary ? (
                    <Image
                      src={`/api/jellyfin/image?itemId=${item.Id}&tag=${item.ImageTags.Primary}`}
                      alt={item.Name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-jf-text-muted text-xs">
                      ?
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-jf-text-primary truncate group-hover:text-jf-primary transition-colors">
                    {item.Name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="neutral" className="text-[10px]">{item.Type}</Badge>
                    {item.ProductionYear && (
                      <span className="text-xs text-jf-text-muted">{item.ProductionYear}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {hasMore && (
              <div className="pt-2 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  loading={loading}
                  onClick={() => fetchItems(false)}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
