import type { ReactNode } from 'react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-jf-bg flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-jf-border">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 rounded-lg bg-jf-primary flex items-center justify-center">
            <span className="text-white text-sm font-bold">JB</span>
          </div>
          <span className="text-jf-text-primary font-semibold text-lg">
            Jellybox Server
          </span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-jf-border text-center">
        <p className="text-jf-text-muted text-sm">
          © {new Date().getFullYear()} Jellybox Server
        </p>
      </footer>
    </div>
  )
}
