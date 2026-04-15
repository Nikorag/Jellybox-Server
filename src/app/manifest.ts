import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Jellybox',
    short_name: 'Jellybox',
    description: 'Link your Jellyfin server and assign RFID tags to your media library.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#101010',
    theme_color: '#101010',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
