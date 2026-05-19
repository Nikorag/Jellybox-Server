import { NextResponse } from 'next/server'
import { getFirmwareManifest, selectBuild } from '@/lib/firmware-manifest'
import { DEFAULT_SKU, isKnownSku } from '@/lib/skus'

/**
 * GET /api/firmware/web-tools-manifest.json?sku=<skuId>
 *
 * ESP Web Tools formatted manifest for the in-browser flasher on /docs/firmware.
 * Built by selecting the build matching the requested SKU and re-shaping it.
 * `chipFamily` and `mergedUrl` must be present on the matching build —
 * returns 503 until they are.
 *
 * https://esphome.github.io/esp-web-tools/
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const skuParam = url.searchParams.get('sku')?.trim() || DEFAULT_SKU
  const sku = isKnownSku(skuParam) ? skuParam : DEFAULT_SKU

  const manifest = await getFirmwareManifest()
  const build = selectBuild(manifest, sku)

  if (!manifest || !build || !build.chipFamily || !build.mergedUrl) {
    return NextResponse.json(
      { error: 'Web flasher manifest unavailable for this SKU.' },
      { status: 503 },
    )
  }

  return NextResponse.json(
    {
      name: 'Jellybox',
      version: manifest.version,
      builds: [
        {
          chipFamily: build.chipFamily,
          parts: [{ path: build.mergedUrl, offset: 0 }],
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
