'use client'

import { useState } from 'react'
import type { ActivityLog, Device } from '@prisma/client'
import { Badge } from '@/components/ui'
import { formatRelativeTime } from '@/lib/utils'

type LogWithDevice = ActivityLog & { device: Pick<Device, 'name'> | null }

export default function RecentActivityFeed({ logs }: { logs: LogWithDevice[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? logs : logs.slice(0, 10)

  return (
    <section>
      <h2 className="text-base font-semibold text-jf-text-primary mb-4">Recent activity</h2>

      {logs.length === 0 ? (
        <p className="text-sm text-jf-text-muted">
          No activity yet. Scan a tag with your Jellybox device to get started.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            {displayed.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-jf-surface transition-colors"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    log.success ? 'bg-jf-success' : 'bg-jf-error'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-jf-text-primary truncate">
                    {log.jellyfinItemTitle ?? (
                      <span className="text-jf-text-muted italic">
                        {log.errorCode === 'UNASSIGNED' ? 'Unassigned tag' : 'Unknown content'}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-jf-text-muted">
                    {log.deviceName} · <code className="font-mono">{log.tagId.slice(0, 8)}</code>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!log.success && log.errorCode && (
                    <Badge variant="error" className="hidden sm:inline-flex">
                      {log.errorCode}
                    </Badge>
                  )}
                  <span className="text-xs text-jf-text-muted whitespace-nowrap">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </div>
              </div>
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
        </>
      )}
    </section>
  )
}
