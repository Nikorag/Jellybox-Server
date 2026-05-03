import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifySecret } from '@/lib/crypto'
import { getCachedFirmwareManifest } from '@/lib/firmware-manifest'

/**
 * GET /api/device/me
 *
 * Called by the physical device on boot to confirm its API key is still valid
 * and fetch its display configuration for the eInk screen.
 *
 * Auth: Authorization: Bearer jb_<key>
 *
 * 200 { name, scanMode, latestFirmware? }
 * 401 missing or invalid key — device should show "Unpaired" on eInk
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization')
  const rawKey = authHeader?.replace(/^Bearer\s+/i, '').trim()

  if (!rawKey) {
    return NextResponse.json({ error: 'Missing API key.' }, { status: 401 })
  }

  const keyPrefix = rawKey.slice(0, 11) // "jb_" + 8 chars
  const candidates = await db.device.findMany({
    where: { apiKeyPrefix: keyPrefix },
  })

  let device: (typeof candidates)[number] | null = null
  for (const candidate of candidates) {
    if (await verifySecret(rawKey, candidate.apiKeyHash)) {
      device = candidate
      break
    }
  }

  if (!device) {
    return NextResponse.json({ error: 'Invalid or revoked API key.' }, { status: 401 })
  }

  // Update last seen
  await db.device.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  })

  const scanMode =
    !!device.scanModeToken &&
    !!device.scanModeExpiresAt &&
    device.scanModeExpiresAt > new Date()

  const latestFirmware = getCachedFirmwareManifest()

  return NextResponse.json({
    name: device.name,
    scanMode,
    ...(latestFirmware ? { latestFirmware } : {}),
  })
}
