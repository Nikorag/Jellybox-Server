'use client'

import Script from 'next/script'
import { useState, type CSSProperties, type DetailedHTMLProps, type HTMLAttributes } from 'react'
import type { Sku, SkuId } from '@/lib/skus'

/**
 * The ESP Web Tools install button is a Web Component (`<esp-web-install-button>`)
 * loaded as an ES module from unpkg. It only works in Chromium-based browsers over
 * HTTPS (or localhost) because it relies on the Web Serial API. The manifest URL
 * points at /api/firmware/web-tools-manifest.json on this server, which derives
 * an ESP Web Tools manifest from the cached firmware release info for a given SKU.
 *
 * A blank device can't tell us which hardware variant it is, so the user picks
 * a SKU from the dropdown before flashing.
 */

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'esp-web-install-button': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & { manifest?: string },
        HTMLElement
      >
    }
  }
}

const buttonStyle: CSSProperties = {
  ['--esp-tools-button-color' as string]: 'white',
  ['--esp-tools-button-text-color' as string]: '#0b0d12',
  ['--esp-tools-button-border-radius' as string]: '0.5rem',
}

export default function WebFlasher({ skus, defaultSku }: { skus: readonly Sku[]; defaultSku: SkuId }) {
  const [selectedSku, setSelectedSku] = useState<string>(defaultSku)
  const manifestUrl = `/api/firmware/web-tools-manifest.json?sku=${encodeURIComponent(selectedSku)}`
  const selected = skus.find((s) => s.id === selectedSku) ?? skus.find((s) => s.id === defaultSku)

  return (
    <div className="not-prose flex flex-col gap-3" style={buttonStyle}>
      <Script
        type="module"
        src="https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module"
        strategy="afterInteractive"
      />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-jf-text-primary">Hardware variant</span>
        <select
          value={selectedSku}
          onChange={(e) => setSelectedSku(e.target.value)}
          className="rounded-lg border border-jf-border bg-jf-elevated px-3 py-2 text-jf-text-primary focus:outline-none focus:ring-2 focus:ring-jf-primary/40"
        >
          {skus.map((sku) => (
            <option key={sku.id} value={sku.id}>
              {sku.displayName}
            </option>
          ))}
        </select>
        {selected && (
          <span className="text-xs text-jf-text-muted">{selected.description}</span>
        )}
      </label>

      <esp-web-install-button key={selectedSku} manifest={manifestUrl}>
        <button
          slot="activate"
          className="inline-flex items-center justify-center rounded-lg bg-jf-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Connect &amp; install
        </button>
        <span slot="unsupported" className="text-sm text-jf-text-secondary">
          Your browser doesn&apos;t support Web Serial. Use the latest Chrome, Edge, or Opera on
          desktop, or fall back to the Arduino IDE flow below.
        </span>
        <span slot="not-allowed" className="text-sm text-jf-text-secondary">
          The web flasher requires a secure context (HTTPS or localhost).
        </span>
      </esp-web-install-button>
    </div>
  )
}
