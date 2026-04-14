import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-jf-bg flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-jf-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
            <Image src="/Icon.png" alt="Jellybox" width={32} height={32} />
          </div>
          <span className="font-semibold text-jf-text-primary text-lg">Jellybox Server</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="text-sm font-medium text-jf-text-secondary hover:text-jf-text-primary transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="px-4 py-2 rounded-lg bg-jf-primary hover:bg-jf-primary-hover text-white text-sm font-semibold transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jf-primary-muted border border-jf-primary/30 text-jf-primary text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-jf-primary" />
          Companion app for Jellybox hardware
        </div>

        <h1 className="text-5xl font-extrabold text-jf-text-primary max-w-2xl leading-tight mb-6">
          Give kids{' '}
          <span className="text-jf-primary">physical control</span>{' '}
          of their media
        </h1>

        <p className="text-lg text-jf-text-secondary max-w-xl mb-10 leading-relaxed">
          Jellybox lets children scan RFID tags to play movies, music, and shows from your Jellyfin
          server — no apps, no passwords, no rabbit holes.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/auth/signup"
            className="px-6 py-3 rounded-lg bg-jf-primary hover:bg-jf-primary-hover text-white font-semibold text-sm transition-colors"
          >
            Create free account
          </Link>
          <Link
            href="/auth/signin"
            className="px-6 py-3 rounded-lg border border-jf-border bg-jf-surface hover:bg-jf-elevated text-jf-text-primary font-semibold text-sm transition-colors"
          >
            Sign in
          </Link>
        </div>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl w-full text-left">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-jf-surface border border-jf-border rounded-xl p-5"
            >
              <div className="w-9 h-9 rounded-lg bg-jf-primary-muted border border-jf-primary/30 flex items-center justify-center mb-3 text-jf-primary">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-jf-text-primary text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-jf-text-secondary leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 py-5 border-t border-jf-border text-center">
        <p className="text-xs text-jf-text-muted">
          © {new Date().getFullYear()} Jellybox Server · Built for Jellyfin
        </p>
      </footer>
    </div>
  )
}

const features = [
  {
    title: 'Link your Jellyfin server',
    description:
      'Connect securely to any Jellyfin instance. Browse your full library and choose playback clients.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  {
    title: 'Assign RFID tags',
    description:
      'Map physical RFID tags to any movie, show, album, or playlist in your library. One scan, instant playback.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    title: 'Manage multiple devices',
    description:
      'One account, many rooms. Each Jellybox device gets its own API key and default playback client.',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
]
