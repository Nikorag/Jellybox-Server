'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/ui'

type Row = { key: string; value: string }

function recordToRows(record: Record<string, string>): Row[] {
  const rows = Object.entries(record).map(([key, value]) => ({ key, value }))
  return rows.length > 0 ? rows : []
}

function rowsToRecord(rows: Row[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const { key, value } of rows) {
    const k = key.trim()
    if (k) result[k] = value
  }
  return result
}

interface Props {
  /** Initial headers (already-decrypted, passed from the server page) */
  initialHeaders: Record<string, string>
  onSave: (headers: Record<string, string>) => Promise<{ error?: string } | void>
  /** If true, wrap in a card-style section with a heading */
  standalone?: boolean
}

export default function CustomHeadersEditor({ initialHeaders, onSave, standalone = false }: Props) {
  const [rows, setRows] = useState<Row[]>(recordToRows(initialHeaders))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function addRow() {
    setRows((r) => [...r, { key: '', value: '' }])
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, field: 'key' | 'value', val: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    const result = await onSave(rowsToRecord(rows))
    setSaving(false)
    if (result && 'error' in result && result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const content = (
    <div className="space-y-3">
      <p className="text-xs text-jf-text-muted leading-relaxed">
        Extra HTTP headers sent with every request to your Jellyfin server — useful for
        Cloudflare Access (<code className="text-jf-text-secondary">CF-Access-Client-Id</code> /
        {' '}<code className="text-jf-text-secondary">CF-Access-Client-Secret</code>) or other
        auth proxies.
      </p>

      {rows.length === 0 ? (
        <p className="text-xs text-jf-text-muted italic">No custom headers set.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input
                placeholder="Header name"
                value={row.key}
                onChange={(e) => updateRow(i, 'key', e.target.value)}
                className="flex-1 font-mono text-xs"
                aria-label="Header name"
              />
              <Input
                placeholder="Value"
                value={row.value}
                onChange={(e) => updateRow(i, 'value', e.target.value)}
                className="flex-1 font-mono text-xs"
                aria-label="Header value"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="mt-1 p-1.5 rounded-md text-jf-text-muted hover:text-jf-error hover:bg-jf-error/10 transition-colors flex-shrink-0"
                aria-label="Remove header"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-xs text-jf-primary hover:text-jf-primary-hover transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add header
      </button>

      {error && (
        <p className="text-xs text-jf-error">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button size="sm" onClick={handleSave} loading={saving}>
          Save headers
        </Button>
        {saved && <span className="text-xs text-jf-success">Saved</span>}
      </div>
    </div>
  )

  if (!standalone) return content

  return (
    <div className="mt-4 pt-4 border-t border-jf-border">
      <h3 className="text-sm font-medium text-jf-text-primary mb-3">Custom headers</h3>
      {content}
    </div>
  )
}
