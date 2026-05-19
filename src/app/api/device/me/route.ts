import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifySecret } from '@/lib/crypto'
import { getFirmwareManifest, selectBuild } from '@/lib/firmware-manifest'
import { DEFAULT_SKU, isKnownSku } from '@/lib/skus'
import { publishDeviceCheckIn } from '@/lib/mqtt'

/**
 * GET /api/device/me
 *
 * Called by the physical device on boot to confirm its API key is still valid
 * and fetch its display configuration for the eInk screen.
 *
 * Auth: Authorization: Bearer jb_<key>
 * Query: ?version=<firmwareVersion>&sku=<skuId>
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

  const url = new URL(req.url)
  const reportedVersion = url.searchParams.get('version')?.trim() || null
  const reportedSku = url.searchParams.get('sku')?.trim() || null

  // Persist the SKU on first contact (stored default is jb-eink-v1 from the
  // schema). Only adopt a reported value if it's known; log a warning when a
  // device reports a SKU that disagrees with what's stored — that's a sign of
  // a misflashed device and shouldn't silently overwrite.
  let nextSku: string | undefined
  if (reportedSku && isKnownSku(reportedSku)) {
    if (device.sku === DEFAULT_SKU && reportedSku !== device.sku) {
      nextSku = reportedSku
    } else if (reportedSku !== device.sku) {
      console.warn(
        `[device/me] device ${device.id} reports sku=${reportedSku} but DB has ${device.sku}; ignoring.`,
      )
    }
  }

  const skuForOta = nextSku ?? device.sku

  const scanMode =
    !!device.scanModeToken &&
    !!device.scanModeExpiresAt &&
    device.scanModeExpiresAt > new Date()

  // If the device is flagged for an OTA, surface the latest manifest. When the
  // device subsequently reports back the manifest version, treat that as a
  // successful update and clear the pending flag.
  let latestFirmware: { version: string; url: string } | null = null
  let clearPending = false

  if (device.firmwareUpdatePending) {
    const manifest = await getFirmwareManifest()
    const build = selectBuild(manifest, skuForOta)
    if (manifest && build) {
      if (reportedVersion && reportedVersion === manifest.version) {
        clearPending = true
      } else {
        latestFirmware = { version: manifest.version, url: build.url }
      }
    }
  }

  await db.device.update({
    where: { id: device.id },
    data: {
      lastSeenAt: new Date(),
      ...(reportedVersion && reportedVersion !== device.firmwareVersion
        ? { firmwareVersion: reportedVersion }
        : {}),
      ...(nextSku ? { sku: nextSku } : {}),
      ...(clearPending ? { firmwareUpdatePending: false } : {}),
    },
  })

  void publishDeviceCheckIn({ id: device.id, name: device.name })

  return NextResponse.json({
    name: device.name,
    scanMode,
    ...(latestFirmware ? { latestFirmware } : {}),
  })
}
