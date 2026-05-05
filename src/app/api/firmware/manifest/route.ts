import { NextResponse } from 'next/server'
import { getFirmwareManifest, getFirmwareManifestUrl } from '@/lib/firmware-manifest'

/**
 * GET /api/firmware/manifest
 *
 * Debug endpoint: shows the firmware manifest values the server is currently
 * advertising to devices via /api/device/me, plus the upstream source URL.
 */
export async function GET() {
  const manifest = await getFirmwareManifest()
  return NextResponse.json({
    source: getFirmwareManifestUrl(),
    manifest,
  })
}
