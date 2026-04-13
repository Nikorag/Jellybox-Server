import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        // Jellyfin image proxy — allows any query string (?imageProxy=...&tag=...)
        pathname: '/api/jellyfin/**',
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
