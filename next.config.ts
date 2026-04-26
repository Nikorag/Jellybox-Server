import type { NextConfig } from 'next'

// Hosts allowed to fetch dev resources (HMR, client chunks). Set NEXT_DEV_ORIGINS
// in .env (or .env.local) to a comma-separated list of LAN hostnames/IPs you
// access dev from. Each entry is also expanded to include common dev ports so
// Next's match works whether it compares hostname-only or full origin.
const rawDevOrigins = process.env.NEXT_DEV_ORIGINS
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean) ?? []
const devOrigins = rawDevOrigins.flatMap((host) =>
  host.includes(':') ? [host] : [host, `${host}:3000`],
)
if (process.env.NODE_ENV !== 'production') {
  console.log('[next.config] allowedDevOrigins:', devOrigins.length ? devOrigins : '(none)')
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  images: {
    localPatterns: [
      {
        // Jellyfin image proxy — allows any query string (?imageProxy=...&tag=...)
        pathname: '/api/jellyfin/**',
      },
      {
        // Extension image proxy — same pattern as Jellyfin's.
        pathname: '/api/extensions/**',
      },
      {
        pathname: '/Icon.png',
      },
      {
        pathname: '/product.png',
      },
      {
        pathname: '/product_two.png',
      },
    ],
    remotePatterns: [
      // Allow Jellyfin server images — patterns are added at runtime via env
      // Users' Jellyfin servers are arbitrary URLs, so we allow all HTTPS origins.
      // For stricter setups, scope this to known server hostnames.
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
