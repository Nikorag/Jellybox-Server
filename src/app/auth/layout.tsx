import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-jf-bg flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 pt-[calc(1.25rem+env(safe-area-inset-top))] border-b border-jf-border">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Image src="/Icon.png" alt="Jellybox" width={32} height={32} className="flex-shrink-0" />
          <span className="text-jf-text-primary font-semibold text-lg">
            Jellybox
          </span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-jf-border text-center">
        <p className="text-jf-text-muted text-sm">
          © {new Date().getFullYear()} Jellybox
        </p>
      </footer>
    </div>
  )
}
