import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import DocsSidebar from './DocsSidebar'

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-jf-bg flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-jf-border flex items-center gap-4 bg-jf-surface sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2.5 text-jf-text-secondary hover:text-jf-text-primary transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-px h-5 bg-jf-border" />
        <Link href="/" className="flex items-center gap-2">
          <Image src="/Icon.png" alt="Jellybox" width={24} height={24} className="flex-shrink-0" />
          <span className="font-semibold text-jf-text-primary text-sm">Jellybox</span>
        </Link>
        <span className="text-jf-text-muted text-sm">/</span>
        <span className="text-jf-text-secondary text-sm">Self-hosting Guide</span>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-jf-border bg-jf-surface hidden md:block">
          <div className="sticky top-[57px] p-4">
            <DocsSidebar />
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-3xl mx-auto px-6 py-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
