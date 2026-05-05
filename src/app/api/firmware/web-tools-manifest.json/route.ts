import { NextResponse } from 'next/server'
import { getFirmwareManifest } from '@/lib/firmware-manifest'

/**
 * GET /api/firmware/web-tools-manifest.json
 *
 * ESP Web Tools formatted manifest for the in-browser flasher on /docs/firmware.
 * Built by re-shaping the cached firmware manifest — `chipFamily` and `mergedUrl`
 * must be present on the upstream manifest. Returns 503 until they are.
 *
 * https://esphome.github.io/esp-web-tools/
 */
export async function GET() {
  const manifest = await getFirmwareManifest()

  if (!manifest || !manifest.chipFamily || !manifest.mergedUrl) {
    return NextResponse.json(
      { error: 'Web flasher manifest unavailable.' },
      { status: 503 },
    )
  }

  return NextResponse.json(
    {
      name: 'Jellybox',
      version: manifest.version,
      builds: [
        {
          chipFamily: manifest.chipFamily,
          parts: [{ path: manifest.mergedUrl, offset: 0 }],
        },
      ],
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
    },
  )
}
