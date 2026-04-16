import type { Metadata } from 'next'
import Image from 'next/image'
import { version } from '../../../../package.json'

export const metadata: Metadata = { title: 'About — Jellybox' }

export default function AboutPage() {
  return (
    <div className="max-w-md space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-jf-text-primary mb-1">About</h1>
        <p className="text-sm text-jf-text-muted">Jellybox v{version}</p>
      </div>

      <div className="p-5 rounded-xl border border-jf-border bg-jf-surface space-y-3">
        <div className="flex items-center gap-3">
          <Image src="/Icon.png" alt="Jellybox" width={40} height={40} className="flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-jf-text-primary">Jellybox</p>
            <p className="text-xs text-jf-text-muted">Written by Jamie Bartlett</p>
          </div>
        </div>
        <p className="text-xs text-jf-text-secondary leading-relaxed">
          An RFID-based physical media player companion for Jellyfin. Tap NFC tags to trigger
          playback — no typing, no menus.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-jf-text-secondary">If you enjoy Jellybox, consider buying me a coffee:</p>
        <a
          href="https://ko-fi.com/H2H01BK2VY"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block"
        >
          <Image
            src="https://storage.ko-fi.com/cdn/kofi4.png?v=6"
            alt="Buy Me a Coffee at ko-fi.com"
            width={144}
            height={36}
            unoptimized
          />
        </a>
      </div>
    </div>
  )
}
