const CACHE = 'jellybox-v1'
const OFFLINE_URL = '/offline'

// Install — pre-cache the offline fallback page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL))
  )
  self.skipWaiting()
})

// Activate — delete any old versioned caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API routes — always go to the network, never cache
  if (url.pathname.startsWith('/api/')) return

  // Next.js static chunks — cache-first (content-hashed, safe to cache forever)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, clone))
            return response
          })
      )
    )
    return
  }

  // Navigation requests — network first, serve /offline on failure
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((cached) => cached ?? new Response('Offline', { status: 503 }))
      )
    )
  }
})
