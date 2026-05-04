'use client'

import Script from 'next/script'
import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from 'react'

/**
 * The ESP Web Tools install button is a Web Component (`<esp-web-install-button>`)
 * loaded as an ES module from unpkg. It only works in Chromium-based browsers over
 * HTTPS (or localhost) because it relies on the Web Serial API. The manifest URL
 * points at /api/firmware/web-tools-manifest.json on this server, which derives
 * an ESP Web Tools manifest from the cached firmware release info.
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
  // ESP Web Tools styles its slotted button via CSS custom properties.
  ['--esp-tools-button-color' as string]: 'white',
  ['--esp-tools-button-text-color' as string]: '#0b0d12',
  ['--esp-tools-button-border-radius' as string]: '0.5rem',
}

export default function WebFlasher() {
  return (
    <div className="not-prose flex flex-col gap-2" style={buttonStyle}>
      <Script
        type="module"
        src="https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module"
        strategy="afterInteractive"
      />
      <esp-web-install-button manifest="/api/firmware/web-tools-manifest.json">
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
