'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, Button } from '@/components/ui'

export default function ApiKeyDisplay({
  rawKey,
  deviceId,
}: {
  rawKey: string
  deviceId: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(rawKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="p-4 rounded-lg bg-jf-warning/10 border border-jf-warning/30">
        <p className="text-sm text-jf-warning font-medium mb-1">
          ⚠ Copy this key now — it won&apos;t be shown again
        </p>
        <p className="text-xs text-jf-text-secondary">
          This is the only time the full API key will be displayed. Enter it into your device firmware, then this dialog can be closed.
        </p>
      </div>

      <Card>
        <CardContent>
          <label className="block text-xs font-medium text-jf-text-muted mb-2">API Key</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-jf-bg border border-jf-border rounded-md px-3 py-2 text-jf-text-primary break-all select-all">
              {rawKey}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="flex-shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Link href={`/dashboard/devices/${deviceId}`}>
        <Button className="w-full">
          Done — Go to Device Settings
        </Button>
      </Link>
    </div>
  )
}
