'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { RfidTag } from '@prisma/client'
import { Button, EmptyState } from '@/components/ui'
import TagCard from './TagCard'

export default function TagGrid({
  tags,
  jellyfinServerUrl,
}: {
  tags: RfidTag[]
  jellyfinServerUrl: string | null
}) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filtered = tags.filter((tag) => {
    const matchesSearch =
      !search ||
      tag.label.toLowerCase().includes(search.toLowerCase()) ||
      tag.tagId.toLowerCase().includes(search.toLowerCase())

    const matchesType =
      typeFilter === 'all' ||
      (tag.jellyfinItemType?.toLowerCase() === typeFilter)

    return matchesSearch && matchesType
  })

  return (
    <div>
      {/* Filters */}
      {tags.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags…"
            className="form-input flex-1 rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary placeholder:text-jf-text-muted text-sm focus:border-jf-primary focus:ring-jf-primary/30"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="form-select rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary text-sm focus:border-jf-primary focus:ring-jf-primary/30"
          >
            <option value="all">All types</option>
            <option value="movie">Movies</option>
            <option value="series">Series</option>
            <option value="episode">Episodes</option>
            <option value="album">Albums</option>
            <option value="playlist">Playlists</option>
          </select>
        </div>
      )}

      {/* Grid */}
      {tags.length === 0 ? (
        <EmptyState
          title="No tags yet"
          description="Register your first RFID tag to start assigning content."
          action={
            <Link href="/dashboard/tags/new">
              <Button>Register your first tag</Button>
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No tags match" description="Try adjusting your search or filter." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((tag) => (
            <TagCard key={tag.id} tag={tag} jellyfinServerUrl={jellyfinServerUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
