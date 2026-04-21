import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { auth } from '@/auth'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'
import { getAuthProviderFlags, publicPagesDisabled } from '@/lib/auth-flags'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
}

export default async function LandingPage() {
  const session = await auth()
  const user = session?.user

  if (publicPagesDisabled()) {
    redirect(user ? '/dashboard' : '/auth/signin')
  }

  const { signupEnabled } = getAuthProviderFlags()

  const heroImages = [
    {
      src: '/product.png',
      alt: 'Jellybox device on a desk with four collectible figurines on coloured bases — a robot, dinosaur, wizard and cat.',
    },
    {
      src: '/product_two.png',
      alt: 'Jellybox on a living-room console with a kids cartoon playing on the TV behind it — the eInk screen shows "Ready to scan".',
    },
  ]
  const heroImage = heroImages[Math.floor(Math.random() * heroImages.length)]

  return (
    <div className="min-h-screen bg-jf-bg flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 pt-[calc(1.25rem+env(safe-area-inset-top))] border-b border-jf-border flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/Icon.png" alt="Jellybox" width={32} height={32} className="flex-shrink-0" />
          <span className="font-semibold text-jf-text-primary text-lg">Jellybox</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="text-sm font-medium text-jf-text-secondary hover:text-jf-text-primary transition-colors"
          >
            Docs
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-jf-primary hover:bg-jf-primary-hover text-white text-sm font-semibold transition-colors"
            >
              My Jellybox
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-sm font-medium text-jf-text-secondary hover:text-jf-text-primary transition-colors"
              >
                Sign in
              </Link>
              {signupEnabled && (
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 rounded-lg bg-jf-primary hover:bg-jf-primary-hover text-white text-sm font-semibold transition-colors"
                >
                  Get started
                </Link>
              )}
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col px-4 py-16 sm:py-20">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jf-primary-muted border border-jf-primary/30 text-jf-primary text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-jf-primary" />
              Companion app for Jellybox hardware
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-jf-text-primary leading-tight mb-6">
              Give kids
              <br />
              <span className="text-jf-primary whitespace-nowrap">physical control</span>
              <br />
              of their media
            </h1>

            <p className="text-lg text-jf-text-secondary max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              Jellybox lets children scan RFID tags to play movies, music, and shows from your Jellyfin
              server — no apps, no passwords, no rabbit holes.
            </p>

            {user ? (
              <div className="flex flex-col items-center lg:items-start gap-4 p-6 rounded-2xl border border-jf-primary/30 bg-jf-primary-muted max-w-sm w-full mx-auto lg:mx-0">
                <p className="text-sm text-jf-text-secondary">
                  Welcome back, <span className="font-semibold text-jf-text-primary">{user.name ?? user.email}</span>
                </p>
                <Link
                  href="/dashboard"
                  className="w-full py-2.5 px-4 rounded-lg bg-jf-primary hover:bg-jf-primary-hover text-white font-semibold text-sm transition-colors text-center"
                >
                  Go to My Jellybox
                </Link>
                <div className="flex gap-4 text-xs text-jf-text-muted">
                  <Link href="/dashboard/tags" className="hover:text-jf-primary transition-colors">Tags</Link>
                  <Link href="/dashboard/devices" className="hover:text-jf-primary transition-colors">Devices</Link>
                  <Link href="/dashboard/jellyfin" className="hover:text-jf-primary transition-colors">Jellyfin</Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                {signupEnabled && (
                  <Link
                    href="/auth/signup"
                    className="px-6 py-3 rounded-lg bg-jf-primary hover:bg-jf-primary-hover text-white font-semibold text-sm transition-colors"
                  >
                    Create free account
                  </Link>
                )}
                <Link
                  href="/auth/signin"
                  className="px-6 py-3 rounded-lg border border-jf-border bg-jf-surface hover:bg-jf-elevated text-jf-text-primary font-semibold text-sm transition-colors"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>

          {/* Product shot */}
          <div className="relative">
            {/* Soft jellyfin-purple glow behind the image */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 blur-3xl opacity-60 pointer-events-none"
              style={{
                background:
                  'radial-gradient(60% 60% at 50% 55%, rgba(170, 92, 194, 0.35), transparent 70%)',
              }}
            />
            <div className="relative mx-auto max-w-md lg:max-w-none aspect-[4/5] rounded-3xl overflow-hidden border border-jf-border bg-jf-surface shadow-2xl">
              <Image
                src={heroImage.src}
                alt={heroImage.alt}
                fill
                sizes="(max-width: 1024px) 90vw, 480px"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl w-full text-left mx-auto">
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

      {/* Open source section */}
      <section className="border-t border-jf-border bg-jf-surface">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jf-elevated border border-jf-border text-jf-text-secondary text-xs font-medium mb-6">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Open source
          </div>

          <h2 className="text-3xl font-bold text-jf-text-primary mb-4">
            Fully self-hostable
          </h2>
          <p className="text-jf-text-secondary text-sm leading-relaxed max-w-lg mx-auto mb-10">
            Jellybox is open source. Run the server on your own infrastructure and build the
            hardware yourself — everything you need is on GitHub.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
            <a
              href="https://github.com/Nikorag/Jellybox-Server"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 p-5 rounded-xl border border-jf-border bg-jf-bg hover:border-jf-primary/40 hover:bg-jf-primary-muted transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-jf-elevated border border-jf-border flex items-center justify-center flex-shrink-0 group-hover:border-jf-primary/30 transition-colors">
                <svg className="w-5 h-5 text-jf-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-jf-text-primary">Jellybox Server</p>
                  <svg className="w-3.5 h-3.5 text-jf-text-muted opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <p className="text-xs text-jf-text-muted mt-0.5">Next.js web dashboard &amp; device API</p>
              </div>
            </a>

            <a
              href="https://github.com/Nikorag/Jellybox-firmware"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 p-5 rounded-xl border border-jf-border bg-jf-bg hover:border-jf-primary/40 hover:bg-jf-primary-muted transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-jf-elevated border border-jf-border flex items-center justify-center flex-shrink-0 group-hover:border-jf-primary/30 transition-colors">
                <svg className="w-5 h-5 text-jf-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-jf-text-primary">Jellybox Firmware</p>
                  <svg className="w-3.5 h-3.5 text-jf-text-muted opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <p className="text-xs text-jf-text-muted mt-0.5">ESP32 Arduino firmware &amp; build guide</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <footer className="px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t border-jf-border text-center">
        <p className="text-xs text-jf-text-muted">
          © {new Date().getFullYear()} Jellybox · Open source · Built for Jellyfin
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
