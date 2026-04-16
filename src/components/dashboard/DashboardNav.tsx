'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import ContextSwitcher from './ContextSwitcher'

type ContextAccount = { id: string; name: string | null; email: string; image?: string | null }

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  ownerOnly?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/devices',
    label: 'Devices',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/tags',
    label: 'Tags',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/jellyfin',
    label: 'Jellyfin',
    ownerOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    ),
  },
  {
    href: '/dashboard/account',
    label: 'Account',
    ownerOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/partners',
    label: 'Partners',
    ownerOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/settings/webhooks',
    label: 'Webhooks',
    ownerOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
]

function NavContent({
  visibleItems,
  pathname,
  partnerAccounts,
  activeAccountId,
  selfId,
  selfName,
  selfEmail,
  selfImage,
  onNavigate,
}: {
  visibleItems: NavItem[]
  pathname: string
  partnerAccounts: ContextAccount[]
  activeAccountId: string
  selfId: string
  selfName: string | null
  selfEmail: string
  selfImage?: string | null
  onNavigate?: () => void
}) {
  return (
    <>
      {/* Context switcher */}
      {partnerAccounts.length > 0 && (
        <ContextSwitcher
          partnerAccounts={partnerAccounts}
          activeAccountId={activeAccountId}
          selfId={selfId}
          selfName={selfName}
          selfEmail={selfEmail}
        />
      )}

      {/* Nav items */}
      <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-jf-primary-muted text-jf-primary'
                  : 'text-jf-text-secondary hover:bg-jf-elevated hover:text-jf-text-primary',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={cn(isActive ? 'text-jf-primary' : 'text-jf-text-muted')}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-jf-border pt-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={selfName} src={selfImage} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-jf-text-primary truncate">
              {selfName ?? 'User'}
            </p>
            <p className="text-xs text-jf-text-muted truncate">{selfEmail}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="p-1.5 rounded-md text-jf-text-muted hover:text-jf-error hover:bg-jf-error/10 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}

export default function DashboardNav({
  partnerAccounts,
  activeAccountId,
  selfId,
  selfName,
  selfEmail,
  selfImage,
}: {
  partnerAccounts: ContextAccount[]
  activeAccountId: string
  selfId: string
  selfName: string | null
  selfEmail: string
  selfImage?: string | null
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isPartnerContext = activeAccountId !== selfId

  const visibleItems = navItems.filter((item) => !(item.ownerOnly && isPartnerContext))

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const sharedProps = {
    visibleItems,
    pathname,
    partnerAccounts,
    activeAccountId,
    selfId,
    selfName,
    selfEmail,
    selfImage,
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className="hidden md:flex flex-col h-full bg-jf-surface border-r border-jf-border w-60 flex-shrink-0"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-jf-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Image src="/Icon.png" alt="Jellybox" width={32} height={32} className="flex-shrink-0" />
            <span className="font-semibold text-jf-text-primary">Jellybox</span>
          </Link>
        </div>

        <NavContent {...sharedProps} />
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-jf-surface border-b border-jf-border flex items-center px-4 gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md text-jf-text-secondary hover:text-jf-text-primary hover:bg-jf-elevated transition-colors"
          aria-label="Open navigation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/Icon.png" alt="Jellybox" width={28} height={28} className="flex-shrink-0" />
          <span className="font-semibold text-jf-text-primary">Jellybox</span>
        </Link>
      </div>

      {/* Mobile slide-in nav */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <nav
            className="relative flex flex-col w-72 max-w-[85vw] h-full bg-jf-surface border-r border-jf-border"
            aria-label="Main navigation"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-jf-border flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
                <Image src="/Icon.png" alt="Jellybox" width={28} height={28} className="flex-shrink-0" />
                <span className="font-semibold text-jf-text-primary">Jellybox</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-md text-jf-text-muted hover:text-jf-text-primary hover:bg-jf-elevated transition-colors"
                aria-label="Close navigation"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <NavContent {...sharedProps} onNavigate={() => setMobileOpen(false)} />
          </nav>
        </div>
      )}
    </>
  )
}
