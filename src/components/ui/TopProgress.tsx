'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Thin progress bar pinned to the top of the viewport. Shows while:
//   - an internal route transition is in flight (anchor click or programmatic
//     navigation via the router — both end up calling history.pushState /
//     replaceState)
//   - any `window.fetch` request is in flight (covers Server Actions, REST
//     route handlers, RSC payloads — Next.js issues those via fetch)
//
// EventSource and WebSocket are intentionally not tracked: they're long-lived
// by design and would pin the bar on indefinitely.

const NAV_TIMEOUT_MS = 10_000 // safety net — clear nav pending if nothing settles
const SHOW_DELAY_MS = 100 // don't flash for sub-100ms ops
const TRICKLE_MS = 200
const FINISH_DELAY_MS = 250

export default function TopProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [progress, setProgress] = useState(0) // 0..1
  const [visible, setVisible] = useState(false)

  const fetchCount = useRef(0)
  const navPending = useRef(false)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const trickleTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const navTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tick state to trigger checkState in the next effect cycle without
  // creating a stale-closure dependency loop.
  const [tick, setTick] = useState(0)

  // --- Intercept fetch + history mutations (mount-once)
  useEffect(() => {
    const bump = () => setTick((t) => t + 1)

    // fetch wrapping
    const origFetch = window.fetch
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      fetchCount.current += 1
      bump()
      try {
        return await origFetch.apply(window, args)
      } finally {
        fetchCount.current = Math.max(0, fetchCount.current - 1)
        bump()
      }
    }

    // history wrapping — captures both router.push/replace and back/forward.
    const origPush = history.pushState
    const origReplace = history.replaceState

    const startNav = () => {
      navPending.current = true
      if (navTimeout.current) clearTimeout(navTimeout.current)
      navTimeout.current = setTimeout(() => {
        navPending.current = false
        bump()
      }, NAV_TIMEOUT_MS)
      bump()
    }

    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      const ret = origPush.apply(this, args)
      startNav()
      return ret
    }
    history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
      const ret = origReplace.apply(this, args)
      startNav()
      return ret
    }
    const onPopState = () => startNav()
    window.addEventListener('popstate', onPopState)

    return () => {
      window.fetch = origFetch
      history.pushState = origPush
      history.replaceState = origReplace
      window.removeEventListener('popstate', onPopState)
      if (navTimeout.current) clearTimeout(navTimeout.current)
    }
  }, [])

  // --- When the route settles (pathname/searchParams change), clear nav-pending.
  useEffect(() => {
    navPending.current = false
    if (navTimeout.current) {
      clearTimeout(navTimeout.current)
      navTimeout.current = null
    }
    setTick((t) => t + 1)
  }, [pathname, searchParams])

  // --- Drive show/hide + progress animation off the counters
  useEffect(() => {
    const pending = fetchCount.current > 0 || navPending.current

    if (pending) {
      // Start showing after a short delay so quick ops don't flicker the bar
      if (!visible && !showTimer.current) {
        showTimer.current = setTimeout(() => {
          showTimer.current = null
          setVisible(true)
          setProgress(0.08)
          // Trickle toward ~0.85
          if (trickleTimer.current) clearInterval(trickleTimer.current)
          trickleTimer.current = setInterval(() => {
            setProgress((p) => (p >= 0.85 ? p : p + (0.85 - p) * 0.1))
          }, TRICKLE_MS)
        }, SHOW_DELAY_MS)
      }
      if (finishTimer.current) {
        clearTimeout(finishTimer.current)
        finishTimer.current = null
      }
    } else {
      if (showTimer.current) {
        // Hadn't actually shown yet — cancel
        clearTimeout(showTimer.current)
        showTimer.current = null
      }
      if (trickleTimer.current) {
        clearInterval(trickleTimer.current)
        trickleTimer.current = null
      }
      if (visible && !finishTimer.current) {
        setProgress(1)
        finishTimer.current = setTimeout(() => {
          finishTimer.current = null
          setVisible(false)
          setProgress(0)
        }, FINISH_DELAY_MS)
      }
    }
    // tick is referenced so this effect re-runs when counters change.
  }, [tick, visible])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 z-[100] h-0.5"
      style={{
        opacity: visible ? 1 : 0,
        transition: visible ? 'opacity 0ms' : `opacity ${FINISH_DELAY_MS}ms ease-out`,
      }}
    >
      <div
        className="h-full bg-jf-primary shadow-[0_0_8px_var(--tw-shadow-color)] shadow-jf-primary/70 origin-left"
        style={{
          transform: `scaleX(${progress})`,
          transition: `transform ${TRICKLE_MS}ms ease-out`,
        }}
      />
    </div>
  )
}
