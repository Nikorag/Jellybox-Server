import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Hosts allowed to fetch dev resources (HMR, client chunks). Set NEXT_DEV_ORIGINS
  // to a comma-separated list of LAN hostnames/IPs you access dev from.
  allowedDevOrigins: process.env.NEXT_DEV_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean),
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
