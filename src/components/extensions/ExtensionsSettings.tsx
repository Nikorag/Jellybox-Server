'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, EmptyState } from '@/components/ui'
import AddExtensionForm from './AddExtensionForm'
import ExtensionCard from './ExtensionCard'
import type { ExtensionManifest } from '@/lib/extensions/types'

export type ExtensionListItem = {
  id: string
  name: string
  baseUrl: string
  manifest: ExtensionManifest
  enabled: boolean
  account: { displayName: string; defaultClientId: string | null } | null
}

export default function ExtensionsSettings({
  initial,
  isAdmin,
}: {
  initial: ExtensionListItem[]
  isAdmin: boolean
}) {
  const [extensions, setExtensions] = useState(initial)

  function upsert(item: ExtensionListItem) {
    setExtensions((prev) => {
      const idx = prev.findIndex((e) => e.id === item.id)
      if (idx === -1) return [...prev, item]
      const next = prev.slice()
      next[idx] = item
      return next
    })
  }

  function remove(id: string) {
    setExtensions((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {extensions.length > 0 ? (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-jf-text-primary">Available extensions</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {extensions.map((ext) => (
              <ExtensionCard
                key={ext.id}
                extension={ext}
                isAdmin={isAdmin}
                onChange={upsert}
                onRemove={remove}
              />
            ))}
          </CardContent>
        </Card>
      ) : !isAdmin ? (
        <EmptyState
          title="No extensions yet"
          description="An administrator hasn't set up any extensions for this Jellybox."
        />
      ) : null}

      {isAdmin && <AddExtensionForm onCreated={upsert} />}
    </div>
  )
}
