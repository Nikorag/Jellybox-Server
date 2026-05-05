import { NextResponse } from 'next/server'
import {
  getCachedFirmwareManifest,
  getFirmwareManifestUrl,
  refreshFirmwareManifest,
} from '@/lib/firmware-manifest'

/**
 * GET /api/firmware/manifest
 *
 * Debug endpoint: shows the firmware manifest values the server is currently
 * advertising to devices via /api/device/me, plus the upstream source URL.
 */
export async function GET() {
  let cached = getCachedFirmwareManifest()
  if (!cached) {
    cached = await refreshFirmwareManifest()
  }
  return NextResponse.json({
    source: getFirmwareManifestUrl(),
    manifest: cached,
  })
}
