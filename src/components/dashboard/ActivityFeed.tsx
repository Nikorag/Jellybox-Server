'use client'

import { useState } from 'react'
import type { ActivityLog, RfidTag } from '@prisma/client'
import ActivityFeedCard from './ActivityFeedCard'

type LogWithTag = ActivityLog & {
  device: { name: string } | null
  rfidTag: Pick<RfidTag, 'jellyfinItemImageTag' | 'jellyfinItemId'> | null
}

export default function ActivityFeed({ logs }: { logs: LogWithTag[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? logs : logs.slice(0, 10)

  if (logs.length === 0) {
    return (
      <p className="text-sm text-jf-text-muted py-4">
        No activity yet. Scan a tag with your Jellybox to get started.
      </p>
    )
  }

  return (
    <div>
      <div className="space-y-0.5">
        {displayed.map((log) => (
          <ActivityFeedCard key={log.id} log={log} />
        ))}
      </div>
      {logs.length > 10 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-jf-primary hover:text-jf-primary-hover font-medium transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${logs.length} entries`}
        </button>
      )}
    </div>
  )
}
