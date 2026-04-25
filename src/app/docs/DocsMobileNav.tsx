'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/docs', label: 'Overview' },
  { href: '/docs/server', label: 'Deploy' },
  { href: '/docs/extensions', label: 'Extensions' },
  { href: '/docs/hardware', label: 'Hardware' },
  { href: '/docs/firmware', label: 'Firmware' },
  { href: '/docs/case', label: 'Case' },
]

export default function DocsMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="flex overflow-x-auto gap-1 px-3 py-2 scrollbar-hide" aria-label="Docs navigation">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
            pathname === item.href
              ? 'bg-jf-primary-muted text-jf-primary'
              : 'text-jf-text-secondary hover:text-jf-text-primary hover:bg-jf-elevated',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
