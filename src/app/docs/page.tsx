import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Self-hosting Guide — Jellybox' }

const guides = [
  {
    href: '/docs/server',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
    title: 'Deploy the server',
    description: 'Host the Jellybox web dashboard on Vercel with a Neon PostgreSQL database. Covers environment variables, Google OAuth, and email setup.',
    time: '~15 min',
  },
  {
    href: '/docs/extensions',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M14 10V5a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2h5m4-4h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5a2 2 0 012-2zm-4-4l4 4-4 4" />
      </svg>
    ),
    title: 'Use & build extensions',
    description: 'Plug in any media source beyond Jellyfin by writing a small HTTP service. Covers the contract, OAuth, and the reference implementation.',
    time: '~10 min',
  },
  {
    href: '/docs/hardware',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
      </svg>
    ),
    title: 'Build the hardware',
    description: 'Full bill of materials and wiring guide for the ESP32, PN532 NFC reader, Waveshare eInk display, and NeoPixel LED ring.',
    time: '~30 min',
  },
  {
    href: '/docs/firmware',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'Flash the firmware',
    description: 'Install Arduino IDE, add ESP32 board support, install the required libraries, and flash the firmware. Includes first-time device setup.',
    time: '~20 min',
  },
  {
    href: '/docs/case',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: 'Print the case',
    description: 'Downloadable STL files for the Jellybox enclosure, designed to fit the ESP32 dev board, eInk display, and NFC module.',
    time: 'Coming soon',
    soon: true,
  },
]

export default function DocsPage() {
  return (
    <div>
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jf-elevated border border-jf-border text-jf-text-secondary text-xs font-medium mb-4">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Open source
        </div>
        <h1 className="text-3xl font-bold text-jf-text-primary mb-3">Self-hosting Jellybox</h1>
        <p className="text-jf-text-secondary leading-relaxed max-w-2xl">
          Jellybox is fully open source. You can host the server on your own infrastructure, build the
          physical device from off-the-shelf components, and 3D-print a case. This guide covers everything
          from first deployment to your first tag scan.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className={[
              'group flex flex-col gap-3 p-5 rounded-xl border transition-colors',
              guide.soon
                ? 'border-jf-border bg-jf-surface cursor-default pointer-events-none opacity-60'
                : 'border-jf-border bg-jf-surface hover:border-jf-primary/40 hover:bg-jf-primary-muted',
            ].join(' ')}
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-jf-primary-muted border border-jf-primary/30 flex items-center justify-center text-jf-primary">
                {guide.icon}
              </div>
              <span className="text-[11px] font-medium text-jf-text-muted bg-jf-elevated border border-jf-border px-2 py-0.5 rounded-full">
                {guide.time}
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-jf-text-primary text-sm mb-1 group-hover:text-jf-primary transition-colors">
                {guide.title}
              </h2>
              <p className="text-xs text-jf-text-secondary leading-relaxed">{guide.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 p-4 rounded-xl border border-jf-border bg-jf-surface">
        <h3 className="text-sm font-semibold text-jf-text-primary mb-1">Source code</h3>
        <p className="text-xs text-jf-text-secondary mb-3">Both repositories are on GitHub.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href="https://github.com/Nikorag/Jellybox-Server"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-jf-border bg-jf-elevated hover:border-jf-primary/40 text-sm text-jf-text-primary transition-colors"
          >
            <svg className="w-4 h-4 text-jf-text-muted" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Jellybox-Server
          </a>
          <a
            href="https://github.com/Nikorag/Jellybox-firmware"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-jf-border bg-jf-elevated hover:border-jf-primary/40 text-sm text-jf-text-primary transition-colors"
          >
            <svg className="w-4 h-4 text-jf-text-muted" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Jellybox-firmware
          </a>
        </div>
      </div>
    </div>
  )
}
