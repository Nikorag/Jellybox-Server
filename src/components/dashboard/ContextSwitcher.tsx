'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { switchContextAction } from '@/app/dashboard/partners/actions'

type ContextAccount = { id: string; name: string | null; email: string }

function initials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(' ')
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default function ContextSwitcher({
  partnerAccounts,
  activeAccountId,
  selfId,
  selfName,
  selfEmail,
}: {
  partnerAccounts: ContextAccount[]
  activeAccountId: string
  selfId: string
  selfName: string | null
  selfEmail: string
}) {
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  const isPartnerContext = activeAccountId !== selfId
  const activeAccount = isPartnerContext
    ? partnerAccounts.find((a) => a.id === activeAccountId)
    : null

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [open])

  function switchTo(accountId: string | null) {
    setOpen(false)
    startTransition(() => switchContextAction(accountId))
  }

  const displayName = isPartnerContext
    ? `${activeAccount?.name ?? activeAccount?.email ?? 'Unknown'}'s account`
    : 'Your account'

  const displayInitials = isPartnerContext
    ? initials(activeAccount?.name ?? null, activeAccount?.email ?? '')
    : initials(selfName, selfEmail)

  return (
    <div ref={ref} className="relative px-3 pb-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={[
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
          isPartnerContext
            ? 'bg-jf-primary-muted text-jf-primary border border-jf-primary/20'
            : 'bg-jf-elevated text-jf-text-secondary hover:text-jf-text-primary hover:bg-jf-elevated',
        ].join(' ')}
      >
        <span className={[
          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
          isPartnerContext ? 'bg-jf-primary text-white' : 'bg-jf-border text-jf-text-secondary',
        ].join(' ')}>
          {displayInitials}
        </span>
        <span className="flex-1 text-left truncate">{displayName}</span>
        <svg className="w-3 h-3 flex-shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg border border-jf-border bg-jf-surface shadow-lg overflow-hidden">
          {/* Own account */}
          <button
            type="button"
            onClick={() => switchTo(null)}
            className={[
              'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors',
              !isPartnerContext
                ? 'bg-jf-primary-muted text-jf-primary font-medium'
                : 'text-jf-text-secondary hover:bg-jf-elevated hover:text-jf-text-primary',
            ].join(' ')}
          >
            <span className="w-5 h-5 rounded-full bg-jf-border flex items-center justify-center text-[10px] font-bold flex-shrink-0 text-jf-text-secondary">
              {initials(selfName, selfEmail)}
            </span>
            <div className="min-w-0">
              <div className="truncate">Your account</div>
              <div className="text-[10px] opacity-60 truncate">{selfEmail}</div>
            </div>
            {!isPartnerContext && (
              <svg className="w-3 h-3 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Partner accounts */}
          {partnerAccounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => switchTo(account.id)}
              className={[
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors border-t border-jf-border',
                activeAccountId === account.id
                  ? 'bg-jf-primary-muted text-jf-primary font-medium'
                  : 'text-jf-text-secondary hover:bg-jf-elevated hover:text-jf-text-primary',
              ].join(' ')}
            >
              <span className="w-5 h-5 rounded-full bg-jf-primary/20 text-jf-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {initials(account.name, account.email)}
              </span>
              <div className="min-w-0">
                <div className="truncate">{account.name ?? account.email}'s account</div>
                <div className="text-[10px] opacity-60 truncate">{account.email}</div>
              </div>
              {activeAccountId === account.id && (
                <svg className="w-3 h-3 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
