/**
 * Latest Jellybox firmware manifest.
 *
 * The firmware (>=v0.0.3) polls /api/device/me every 30s and looks for an
 * optional `latestFirmware` object. To avoid each device hammering GitHub,
 * we wrap the upstream fetch in Next's data cache with a 5-minute
 * revalidation window — shared across serverless invocations.
 *
 * Source repo and pinned version are configurable:
 *   FIRMWARE_REPO      — default "Nikorag/Jellybox-Firmware"
 *   FIRMWARE_VERSION   — default "latest" (or a tag like "v0.0.2" to pin)
 */
import { unstable_cache } from 'next/cache'

export const DEFAULT_FIRMWARE_REPO = 'Nikorag/Jellybox-Firmware'
export const FIRMWARE_MANIFEST_REVALIDATE_SECONDS = 5 * 60

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
  /** ESP chip family for browser-based flashing, e.g. "ESP32", "ESP32-S3". */
  chipFamily?: string
  /** Self-contained merged binary (offset 0) used by the web flasher. */
  mergedUrl?: string
}

/**
 * Uncached fetch + parse. Exported for tests; routes should call
 * `getFirmwareManifest()` so requests are deduplicated via the data cache.
 */
export async function fetchFirmwareManifest(): Promise<FirmwareManifest | null> {
  try {
    const res = await fetch(getFirmwareManifestUrl(), { cache: 'no-store' })
    if (!res.ok) {
      console.error(`[firmware-manifest] fetch failed: HTTP ${res.status}`)
      return null
    }
    const data: unknown = await res.json()
    if (
      !data ||
      typeof data !== 'object' ||
      typeof (data as Record<string, unknown>).version !== 'string' ||
      typeof (data as Record<string, unknown>).url !== 'string'
    ) {
      console.error('[firmware-manifest] malformed manifest')
      return null
    }
    const next = data as Record<string, unknown>
    return {
      version: next.version as string,
      url: next.url as string,
      ...(typeof next.chipFamily === 'string' ? { chipFamily: next.chipFamily } : {}),
      ...(typeof next.mergedUrl === 'string' ? { mergedUrl: next.mergedUrl } : {}),
    }
  } catch (err) {
    console.error('[firmware-manifest] fetch error:', err)
    return null
  }
}

// Throws on null so unstable_cache does not cache failures.
const cachedFetch = unstable_cache(
  async () => {
    const result = await fetchFirmwareManifest()
    if (!result) throw new Error('[firmware-manifest] unavailable')
    return result
  },
  ['firmware-manifest'],
  { revalidate: FIRMWARE_MANIFEST_REVALIDATE_SECONDS },
)

export async function getFirmwareManifest(): Promise<FirmwareManifest | null> {
  try {
    return await cachedFetch()
  } catch {
    return null
  }
}
