import type { Metadata } from 'next'
import Image from 'next/image'
import ReloadButton from './ReloadButton'

export const metadata: Metadata = { title: 'Offline' }

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-jf-bg flex flex-col items-center justify-center px-6 text-center">
      {/* Icon with offline badge */}
      <div className="mb-8 relative">
        <div className="w-20 h-20 rounded-2xl bg-jf-surface border border-jf-border flex items-center justify-center shadow-card">
          <Image src="/Icon.png" alt="Jellybox" width={48} height={48} className="opacity-60" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-jf-error/15 border border-jf-error/30 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-jf-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M3 3l18 18M10.828 10.83A3 3 0 0112 10.5c.28 0 .548.039.8.11M6.343 6.343A8 8 0 006 12" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-jf-text-primary mb-3">You&apos;re offline</h1>
      <p className="text-jf-text-secondary text-sm max-w-xs leading-relaxed mb-8">
        Jellybox needs a connection to reach your Jellyfin server. Check your network and try again.
      </p>

      {/* Tips */}
      <div className="bg-jf-surface border border-jf-border rounded-xl px-5 py-4 text-left w-full max-w-xs mb-8 space-y-2.5">
        {[
          'Check your Wi-Fi or mobile data',
          'Make sure your VPN is connected',
          'Try reloading the page',
        ].map((tip) => (
          <div key={tip} className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border border-jf-border flex-shrink-0" />
            <span className="text-xs text-jf-text-secondary">{tip}</span>
          </div>
        ))}
      </div>

      <ReloadButton />
    </div>
  )
}
