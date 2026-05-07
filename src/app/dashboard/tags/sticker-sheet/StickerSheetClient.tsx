'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, CardContent, EmptyState, Input } from '@/components/ui'

// ─── Print constants (millimetres) ──────────────────────────────────────────
export const A4_WIDTH_MM = 210
export const A4_HEIGHT_MM = 297
export const CARD_WIDTH_MM = 85.6
export const CARD_HEIGHT_MM = 53.98
export const SAFE_BORDER_MM = 5
export const GUTTER_MM = 4
export const CROP_MARK_LENGTH_MM = 3
export const CROP_MARK_OFFSET_MM = 1
export const CROP_MARK_STROKE_MM = 0.2

type Orientation = 'landscape' | 'portrait'

const COLS = Math.max(1, Math.floor((A4_WIDTH_MM + GUTTER_MM) / (CARD_WIDTH_MM + GUTTER_MM)))
const ROWS = Math.max(1, Math.floor((A4_HEIGHT_MM + GUTTER_MM) / (CARD_HEIGHT_MM + GUTTER_MM)))
const PER_PAGE = COLS * ROWS

const GRID_WIDTH_MM = COLS * CARD_WIDTH_MM + (COLS - 1) * GUTTER_MM
const GRID_HEIGHT_MM = ROWS * CARD_HEIGHT_MM + (ROWS - 1) * GUTTER_MM
const MARGIN_X_MM = (A4_WIDTH_MM - GRID_WIDTH_MM) / 2
const MARGIN_Y_MM = (A4_HEIGHT_MM - GRID_HEIGHT_MM) / 2

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PrefillSticker {
  id: string
  title: string
  logoUrl: string | null
}

interface Sticker {
  id: string
  title: string
  textmarkUrl: string
  logoUrl: string
  orientation: Orientation
  textColor: string
  hideTitle: boolean
}

type Step = 'select' | 'edit'

function makeId() {
  return `s_${Math.random().toString(36).slice(2, 10)}`
}

function blankSticker(): Sticker {
  return {
    id: makeId(),
    title: '',
    textmarkUrl: '',
    logoUrl: '',
    orientation: 'landscape',
    textColor: '#000000',
    hideTitle: false,
  }
}

function isRenderable(s: Sticker) {
  if (!s.logoUrl) return false
  if (s.hideTitle) return true
  return Boolean(s.title || s.textmarkUrl)
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function StickerSheetClient({ prefill }: { prefill: PrefillSticker[] }) {
  const [step, setStep] = useState<Step>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(prefill.map((p) => p.id)),
  )
  const [stickers, setStickers] = useState<Sticker[]>([])

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(prefill.map((p) => p.id)))
  }

  function selectNone() {
    setSelectedIds(new Set())
  }

  function handleContinue() {
    const picked = prefill.filter((p) => selectedIds.has(p.id))
    const next: Sticker[] = picked.map((p) => ({
      id: p.id,
      title: p.title,
      textmarkUrl: '',
      logoUrl: p.logoUrl ?? '',
      orientation: 'landscape',
      textColor: '#000000',
      hideTitle: false,
    }))
    if (next.length === 0) next.push(blankSticker())
    setStickers(next)
    setStep('edit')
  }

  if (step === 'select') {
    return (
      <SelectStep
        prefill={prefill}
        selectedIds={selectedIds}
        onToggle={toggle}
        onSelectAll={selectAll}
        onSelectNone={selectNone}
        onContinue={handleContinue}
      />
    )
  }

  return (
    <EditStep
      stickers={stickers}
      setStickers={setStickers}
      onBack={() => setStep('select')}
    />
  )
}

// ─── Select step ────────────────────────────────────────────────────────────

function SelectStep({
  prefill,
  selectedIds,
  onToggle,
  onSelectAll,
  onSelectNone,
  onContinue,
}: {
  prefill: PrefillSticker[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
  onContinue: () => void
}) {
  if (prefill.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            title="No tags yet"
            description="Register a tag first, then come back to print stickers."
          />
          <div className="flex justify-center mt-2">
            <Button onClick={onContinue}>Start with a blank sticker</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-jf-text-primary">
                Choose which tags to print
              </h2>
              <p className="text-xs text-jf-text-muted">
                {selectedIds.size} of {prefill.length} selected
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onSelectAll}>Select all</Button>
              <Button variant="secondary" size="sm" onClick={onSelectNone}>Select none</Button>
            </div>
          </div>

          <ul className="divide-y divide-jf-border">
            {prefill.map((tag) => {
              const checked = selectedIds.has(tag.id)
              return (
                <li key={tag.id}>
                  <label className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-jf-elevated/50 -mx-2 px-2 rounded">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(tag.id)}
                      className="form-checkbox rounded bg-jf-elevated border-jf-border text-jf-primary focus:ring-jf-primary/30"
                    />
                    <div className="w-10 h-10 flex-shrink-0 rounded bg-jf-elevated border border-jf-border overflow-hidden flex items-center justify-center">
                      {tag.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={tag.logoUrl}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-jf-text-muted">—</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-jf-text-primary truncate">
                        {tag.title || 'Untitled tag'}
                      </p>
                      {!tag.logoUrl && (
                        <p className="text-xs text-jf-text-muted">No artwork — add a logo on the next step.</p>
                      )}
                    </div>
                  </label>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onContinue}>
          Continue {selectedIds.size > 0 ? `with ${selectedIds.size}` : 'with blank sheet'}
        </Button>
      </div>
    </div>
  )
}

// ─── Edit step ──────────────────────────────────────────────────────────────

function EditStep({
  stickers,
  setStickers,
  onBack,
}: {
  stickers: Sticker[]
  setStickers: React.Dispatch<React.SetStateAction<Sticker[]>>
  onBack: () => void
}) {
  const [dirty, setDirty] = useState(false)

  // Warn on tab close / refresh / external nav while the sheet has unsaved edits.
  // Note: this does NOT fire for in-app client-side navigation (e.g. sidebar links).
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // required for some browsers to actually show the prompt
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const renderable = useMemo(() => stickers.filter(isRenderable), [stickers])
  const pages = useMemo(() => {
    const result: Sticker[][] = []
    for (let i = 0; i < renderable.length; i += PER_PAGE) {
      result.push(renderable.slice(i, i + PER_PAGE))
    }
    return result
  }, [renderable])

  function update(id: string, patch: Partial<Sticker>) {
    setDirty(true)
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function remove(id: string) {
    setDirty(true)
    setStickers((prev) => {
      const next = prev.filter((s) => s.id !== id)
      return next.length > 0 ? next : [blankSticker()]
    })
  }

  function move(id: string, direction: -1 | 1) {
    setDirty(true)
    setStickers((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      const newIdx = idx + direction
      if (idx === -1 || newIdx < 0 || newIdx >= prev.length) return prev
      const copy = [...prev]
      ;[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]]
      return copy
    })
  }

  function addBlank() {
    setDirty(true)
    setStickers((prev) => [...prev, blankSticker()])
  }

  function handleBack() {
    if (
      dirty &&
      !window.confirm('Going back to selection will discard your sticker edits. Continue?')
    ) {
      return
    }
    onBack()
  }

  function handlePrint() {
    window.print()
  }

  return (
    <>
      <PrintStyles />

      <div className="no-print mb-6 flex flex-wrap items-center gap-2">
        <Button onClick={handlePrint} disabled={renderable.length === 0}>
          Print {renderable.length > 0 && `· ${renderable.length} sticker${renderable.length === 1 ? '' : 's'}, ${pages.length} page${pages.length === 1 ? '' : 's'}`}
        </Button>
        <Button variant="secondary" onClick={addBlank}>Add blank sticker</Button>
        <Button variant="secondary" onClick={handleBack}>← Back to selection</Button>
      </div>

      <div className="no-print grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] items-start">
        {/* Editor */}
        <div className="space-y-3 min-w-0">
          {stickers.map((sticker, i) => (
            <StickerRow
              key={sticker.id}
              sticker={sticker}
              index={i}
              total={stickers.length}
              onChange={(patch) => update(sticker.id, patch)}
              onMove={(dir) => move(sticker.id, dir)}
              onRemove={() => remove(sticker.id)}
            />
          ))}
        </div>

        {/* Sheet preview (sticky on desktop) */}
        <div className="lg:sticky lg:top-6">
          <h3 className="text-sm font-semibold text-jf-text-secondary uppercase tracking-wider mb-3">
            Sheet preview
          </h3>
          {pages.length === 0 ? (
            <EmptyState
              title="Nothing to print yet"
              description="Add a logo and a title (or textmark) to at least one sticker."
            />
          ) : (
            <div className="space-y-4">
              {pages.map((pageStickers, pageIdx) => (
                <SheetPage key={pageIdx} stickers={pageStickers} screenScale={0.5} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Print-only output: full-size sheets, no scaling */}
      <div className="print-only">
        {pages.map((pageStickers, pageIdx) => (
          <SheetPage key={pageIdx} stickers={pageStickers} screenScale={1} forPrint />
        ))}
      </div>
    </>
  )
}

// ─── Editor row ─────────────────────────────────────────────────────────────

function StickerRow({
  sticker,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  sticker: Sticker
  index: number
  total: number
  onChange: (patch: Partial<Sticker>) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const valid = isRenderable(sticker)
  const hasTextmark = Boolean(sticker.textmarkUrl)
  const titleHidden = sticker.hideTitle

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        {/* Header: index, mini-preview, status, actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-medium text-jf-text-muted shrink-0">#{index + 1}</span>
            <StickerPreview sticker={sticker} screenScale={0.5} />
            <div className="text-xs">
              {valid ? (
                <span className="text-jf-success font-medium">Ready</span>
              ) : (
                <span className="text-jf-text-muted">
                  {titleHidden
                    ? 'Needs logo'
                    : `Needs logo + ${hasTextmark ? 'nothing else' : 'title or textmark'}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">↑</Button>
            <Button variant="secondary" size="sm" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move down">↓</Button>
            <Button variant="destructive" size="sm" onClick={onRemove}>Remove</Button>
          </div>
        </div>

        {/* Layout + colour controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-jf-text-secondary">Layout</span>
            <div className="inline-flex rounded-lg border border-jf-border overflow-hidden">
              {(['landscape', 'portrait'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => onChange({ orientation: o })}
                  className={
                    'px-3 py-1 text-xs font-medium capitalize transition ' +
                    (sticker.orientation === o
                      ? 'bg-jf-primary text-white'
                      : 'bg-jf-elevated text-jf-text-secondary hover:text-jf-text-primary')
                  }
                  aria-pressed={sticker.orientation === o}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-jf-text-secondary">
            Text colour
            <input
              type="color"
              value={sticker.textColor}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className="h-7 w-9 rounded border border-jf-border bg-jf-elevated cursor-pointer"
              aria-label="Title text colour"
              disabled={titleHidden}
            />
          </label>

          <label className="inline-flex items-center gap-2 text-xs text-jf-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={titleHidden}
              onChange={(e) => onChange({ hideTitle: e.target.checked })}
              className="form-checkbox rounded bg-jf-elevated border-jf-border text-jf-primary focus:ring-jf-primary/30"
            />
            Hide title (centre logo)
          </label>
        </div>

        {/* Form fields, full width */}
        <div className="space-y-3">
          <Input
            label="Title"
            value={sticker.title}
            onChange={(e) => onChange({ title: e.target.value })}
            helperText={
              titleHidden
                ? 'Hidden — logo is centred on the sticker.'
                : hasTextmark
                  ? 'Hidden when a textmark is set.'
                  : undefined
            }
            placeholder="e.g. Toy Story"
            disabled={titleHidden}
          />

          <ImageField
            label="Textmark (optional)"
            url={sticker.textmarkUrl}
            onChange={(url) => onChange({ textmarkUrl: url })}
            helperText={
              titleHidden
                ? 'Hidden — logo is centred on the sticker.'
                : 'Wordmark image. If set, replaces the title.'
            }
            disabled={titleHidden}
          />

          <ImageField
            label="Logo (required)"
            url={sticker.logoUrl}
            onChange={(url) => onChange({ logoUrl: url })}
            helperText="Brand mark or artwork."
          />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Image field (URL + upload) ─────────────────────────────────────────────

function ImageField({
  label,
  url,
  onChange,
  helperText,
  disabled = false,
}: {
  label: string
  url: string
  onChange: (url: string) => void
  helperText?: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const isData = url.startsWith('data:')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    onChange(dataUrl)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-jf-text-secondary">{label}</label>
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        <input
          type="url"
          value={isData ? '' : url}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isData ? 'Uploaded image' : 'https://… or upload'}
          disabled={isData || disabled}
          className="form-input flex-1 min-w-0 rounded-lg bg-jf-elevated border-jf-border text-jf-text-primary text-sm focus:border-jf-primary focus:ring-jf-primary/30 disabled:opacity-60"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled}>
            Upload
          </Button>
          {url && (
            <Button type="button" variant="secondary" size="sm" onClick={() => onChange('')} disabled={disabled}>
              Clear
            </Button>
          )}
        </div>
      </div>
      {helperText && <p className="text-xs text-jf-text-muted">{helperText}</p>}
    </div>
  )
}

// ─── Sticker preview (true mm dimensions) ───────────────────────────────────

function StickerPreview({
  sticker,
  screenScale,
}: {
  sticker: Sticker
  screenScale: number
}) {
  return (
    <div
      className="bg-white rounded-sm border border-dashed border-black/20 print:border-0 print:rounded-none shrink-0"
      style={{
        width: `${CARD_WIDTH_MM * screenScale}mm`,
        height: `${CARD_HEIGHT_MM * screenScale}mm`,
      }}
    >
      <StickerInner sticker={sticker} screenScale={screenScale} />
    </div>
  )
}

function StickerInner({ sticker, screenScale }: { sticker: Sticker; screenScale: number }) {
  if (sticker.orientation === 'portrait') {
    // The sticker is physically still 85.6 × 53.98 mm on the sheet (landscape).
    // For a portrait design, render the content into a 53.98 × 85.6 mm portrait
    // box and rotate 90° so it fills the landscape card sideways. After cutting,
    // the user holds the sticker on its short edge to read it portrait.
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: `${CARD_HEIGHT_MM * screenScale}mm`,
            height: `${CARD_WIDTH_MM * screenScale}mm`,
            transform: 'translate(-50%, -50%) rotate(90deg)',
            transformOrigin: 'center',
          }}
        >
          <StickerContent sticker={sticker} screenScale={screenScale} portrait />
        </div>
      </div>
    )
  }

  return <StickerContent sticker={sticker} screenScale={screenScale} portrait={false} />
}

function StickerContent({
  sticker,
  screenScale,
  portrait,
}: {
  sticker: Sticker
  screenScale: number
  portrait: boolean
}) {
  const showTextmark = !sticker.hideTitle && Boolean(sticker.textmarkUrl)
  const showTitle = !sticker.hideTitle && !showTextmark && Boolean(sticker.title)
  const logoOnly = sticker.hideTitle

  // Logo slot for landscape: square sized to the shorter inner dimension.
  const innerHeightMm = CARD_HEIGHT_MM - SAFE_BORDER_MM * 2
  const innerWidthMm = CARD_WIDTH_MM - SAFE_BORDER_MM * 2
  const landscapeLogoMm = Math.min(innerWidthMm, innerHeightMm)

  if (logoOnly) {
    return (
      <div
        style={{
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          padding: `${SAFE_BORDER_MM * screenScale}mm`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {sticker.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sticker.logoUrl}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', border: '1px dashed rgba(0,0,0,0.2)', borderRadius: '2mm' }} />
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        padding: `${SAFE_BORDER_MM * screenScale}mm`,
        display: 'flex',
        flexDirection: portrait ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${(portrait ? 2 : 3) * screenScale}mm`,
        color: sticker.textColor,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Title / textmark — top in portrait, right in landscape */}
      <div
        style={
          portrait
            ? {
                width: '100%',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                maxHeight: `${12 * screenScale}mm`,
              }
            : {
                order: 1,
                flex: 1,
                minWidth: 0,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }
        }
      >
        {showTextmark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sticker.textmarkUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : showTitle ? (
          <span
            style={{
              fontSize: `${10 * screenScale}pt`,
              fontWeight: 600,
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textAlign: portrait ? 'center' : 'left',
              width: '100%',
            }}
          >
            {sticker.title}
          </span>
        ) : null}
      </div>

      {/* Logo — bottom in portrait, left in landscape */}
      <div
        style={
          portrait
            ? { flex: 1, width: '100%', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }
            : {
                order: 0,
                width: `${landscapeLogoMm * screenScale}mm`,
                height: `${landscapeLogoMm * screenScale}mm`,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }
        }
      >
        {sticker.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sticker.logoUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', border: '1px dashed rgba(0,0,0,0.2)', borderRadius: '2mm' }} />
        )}
      </div>
    </div>
  )
}

// ─── Sheet page (A4) ────────────────────────────────────────────────────────

function SheetPage({
  stickers,
  screenScale,
  forPrint = false,
}: {
  stickers: Sticker[]
  screenScale: number
  forPrint?: boolean
}) {
  return (
    <div
      className={forPrint ? 'sticker-print-page' : 'sticker-screen-page'}
      style={{
        position: 'relative',
        width: `${A4_WIDTH_MM * screenScale}mm`,
        height: `${A4_HEIGHT_MM * screenScale}mm`,
        background: 'white',
        boxShadow: forPrint ? undefined : '0 1px 4px rgba(0,0,0,0.25)',
      }}
    >
      {stickers.map((sticker, i) => {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        const left = MARGIN_X_MM + col * (CARD_WIDTH_MM + GUTTER_MM)
        const top = MARGIN_Y_MM + row * (CARD_HEIGHT_MM + GUTTER_MM)
        return (
          <div
            key={sticker.id}
            style={{
              position: 'absolute',
              left: `${left * screenScale}mm`,
              top: `${top * screenScale}mm`,
              width: `${CARD_WIDTH_MM * screenScale}mm`,
              height: `${CARD_HEIGHT_MM * screenScale}mm`,
            }}
          >
            <CropMarks screenScale={screenScale} />
            <div style={{ width: '100%', height: '100%' }}>
              <StickerInner sticker={sticker} screenScale={screenScale} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CropMarks({ screenScale }: { screenScale: number }) {
  const len = CROP_MARK_LENGTH_MM * screenScale
  const off = CROP_MARK_OFFSET_MM * screenScale
  const stroke = `${CROP_MARK_STROKE_MM * screenScale}mm`
  const lineStyle: React.CSSProperties = { position: 'absolute', background: 'black' }

  return (
    <>
      <div style={{ ...lineStyle, left: `-${off}mm`, top: `-${off + CROP_MARK_STROKE_MM / 2}mm`, width: `${len}mm`, height: stroke }} />
      <div style={{ ...lineStyle, left: `-${off + CROP_MARK_STROKE_MM / 2}mm`, top: `-${off}mm`, width: stroke, height: `${len}mm` }} />
      <div style={{ ...lineStyle, right: `-${off}mm`, top: `-${off + CROP_MARK_STROKE_MM / 2}mm`, width: `${len}mm`, height: stroke }} />
      <div style={{ ...lineStyle, right: `-${off + CROP_MARK_STROKE_MM / 2}mm`, top: `-${off}mm`, width: stroke, height: `${len}mm` }} />
      <div style={{ ...lineStyle, left: `-${off}mm`, bottom: `-${off + CROP_MARK_STROKE_MM / 2}mm`, width: `${len}mm`, height: stroke }} />
      <div style={{ ...lineStyle, left: `-${off + CROP_MARK_STROKE_MM / 2}mm`, bottom: `-${off}mm`, width: stroke, height: `${len}mm` }} />
      <div style={{ ...lineStyle, right: `-${off}mm`, bottom: `-${off + CROP_MARK_STROKE_MM / 2}mm`, width: `${len}mm`, height: stroke }} />
      <div style={{ ...lineStyle, right: `-${off + CROP_MARK_STROKE_MM / 2}mm`, bottom: `-${off}mm`, width: stroke, height: `${len}mm` }} />
    </>
  )
}

// ─── Print stylesheet ───────────────────────────────────────────────────────

const PRINT_CSS = `
.print-only { display: none; }
@media print {
  @page { size: A4; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
  body * { visibility: hidden !important; }
  .print-only, .print-only * { visibility: visible !important; }
  .print-only { display: block; position: absolute; left: 0; top: 0; }
  .sticker-print-page { page-break-after: always; break-after: page; }
  .sticker-print-page:last-child { page-break-after: auto; break-after: auto; }
}
`

function PrintStyles() {
  return <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
}
