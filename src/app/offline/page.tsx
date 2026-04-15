import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Offline' }

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-jf-bg flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 opacity-60">
        <Image src="/Icon.png" alt="Jellybox" width={64} height={64} />
      </div>
      <h1 className="text-2xl font-bold text-jf-text-primary mb-2">You&apos;re offline</h1>
      <p className="text-jf-text-secondary text-sm max-w-xs mb-8">
        No internet connection. Connect to a network and try again.
      </p>
      <Link
        href="/dashboard"
        className="px-5 py-2.5 rounded-lg bg-jf-primary hover:bg-jf-primary-hover text-white text-sm font-semibold transition-colors"
      >
        Try again
      </Link>
    </div>
  )
}
