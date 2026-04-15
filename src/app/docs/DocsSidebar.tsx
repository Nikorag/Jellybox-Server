'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const sections = [
  {
    label: 'Getting started',
    items: [
      { href: '/docs', label: 'Overview' },
    ],
  },
  {
    label: 'Server',
    items: [
      { href: '/docs/server', label: 'Deploy to Vercel' },
    ],
  },
  {
    label: 'Hardware',
    items: [
      { href: '/docs/hardware', label: 'Components & wiring' },
      { href: '/docs/firmware', label: 'Flash the firmware' },
    ],
  },
  {
    label: 'Enclosure',
    items: [
      { href: '/docs/case', label: 'Case & STL files' },
    ],
  },
]

export default function DocsSidebar() {
  const pathname = usePathname()

  return (
    <nav className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-jf-text-muted mb-2 px-2">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'block px-2 py-1.5 rounded-md text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-jf-primary-muted text-jf-primary font-medium'
                      : 'text-jf-text-secondary hover:text-jf-text-primary hover:bg-jf-elevated',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
