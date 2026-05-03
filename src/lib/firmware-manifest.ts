/**
 * In-memory cache of the latest Jellybox firmware manifest.
 *
 * The firmware (>=v0.0.3) polls /api/device/me every 30s and looks for an
 * optional `latestFirmware` object. To avoid each device hammering GitHub,
 * the server fetches the public release manifest once and refreshes it on
 * a 5-minute interval. The bootstrap route reads the cached value via
 * `getCachedFirmwareManifest()` and only includes it in the response when
 * a manifest has been successfully fetched at least once.
 *
 * Source repo and pinned version are configurable:
 *   FIRMWARE_REPO      — default "Nikorag/Jellybox-Firmware"
 *   FIRMWARE_VERSION   — default "latest" (or a tag like "v0.0.2" to pin)
 */

export const DEFAULT_FIRMWARE_REPO = 'Nikorag/Jellybox-Firmware'
export const FIRMWARE_MANIFEST_REFRESH_MS = 5 * 60 * 1000

export function getFirmwareManifestUrl(): string {
  const repo = process.env.FIRMWARE_REPO?.trim() || DEFAULT_FIRMWARE_REPO
  const version = process.env.FIRMWARE_VERSION?.trim() || 'latest'
  if (version === 'latest') {
    return `https://github.com/${repo}/releases/latest/download/manifest.json`
  }
  return `https://github.com/${repo}/releases/download/${version}/manifest.json`
}

export type FirmwareManifest = {
  version: string
  url: string
}

let cached: FirmwareManifest | null = null
let timer: ReturnType<typeof setInterval> | null = null

export function getCachedFirmwareManifest(): FirmwareManifest | null {
  return cached
}

export async function refreshFirmwareManifest(): Promise<FirmwareManifest | null> {
  try {
    const res = await fetch(getFirmwareManifestUrl(), { cache: 'no-store' })
    if (!res.ok) {
      console.error(`[firmware-manifest] fetch failed: HTTP ${res.status}`)
      return cached
    }
    const data: unknown = await res.json()
    if (
      !data ||
      typeof data !== 'object' ||
      typeof (data as Record<string, unknown>).version !== 'string' ||
      typeof (data as Record<string, unknown>).url !== 'string'
    ) {
      console.error('[firmware-manifest] malformed manifest, keeping previous cached value')
      return cached
    }
    const next = data as { version: string; url: string }
    cached = { version: next.version, url: next.url }
    return cached
  } catch (err) {
    console.error('[firmware-manifest] fetch error:', err)
    return cached
  }
}

export function startFirmwareManifestPolling(): void {
  if (timer) return
  void refreshFirmwareManifest()
  timer = setInterval(() => {
    void refreshFirmwareManifest()
  }, FIRMWARE_MANIFEST_REFRESH_MS)
  if (typeof (timer as { unref?: () => void }).unref === 'function') {
    ;(timer as unknown as { unref: () => void }).unref()
  }
}

/** Test-only: clear cache and stop the interval. */
export function __resetFirmwareManifestForTests(): void {
  cached = null
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
