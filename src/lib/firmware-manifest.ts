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
 *
 * Manifest schema: from v0.2.0 onwards releases publish a `builds[]` array
 * with one entry per hardware SKU. Older flat-shape manifests are wrapped
 * into a single jb-eink-v1 build so historical releases keep working.
 */
import { unstable_cache } from 'next/cache'
import { DEFAULT_SKU, type SkuId } from '@/lib/skus'

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

export type FirmwareBuild = {
  sku: SkuId
  url: string
  /** ESP chip family for browser-based flashing, e.g. "ESP32", "ESP32-S3". */
  chipFamily?: string
  /** Self-contained merged binary (offset 0) used by the web flasher. */
  mergedUrl?: string
}

export type FirmwareManifest = {
  version: string
  builds: FirmwareBuild[]
}

function parseBuild(raw: unknown): FirmwareBuild | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.sku !== 'string' || typeof r.url !== 'string') return null
  // Accept any SKU string here; the server validates against its own
  // registry before offering an OTA. This keeps the manifest parser
  // forwards-compatible with newer SKUs the running server doesn't know yet.
  return {
    sku: r.sku as SkuId,
    url: r.url,
    ...(typeof r.chipFamily === 'string' ? { chipFamily: r.chipFamily } : {}),
    ...(typeof r.mergedUrl === 'string' ? { mergedUrl: r.mergedUrl } : {}),
  }
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
    if (!data || typeof data !== 'object') {
      console.error('[firmware-manifest] malformed manifest')
      return null
    }
    const obj = data as Record<string, unknown>
    if (typeof obj.version !== 'string') {
      console.error('[firmware-manifest] malformed manifest: missing version')
      return null
    }

    // New shape: { version, builds: [...] }
    if (Array.isArray(obj.builds)) {
      const builds = obj.builds.map(parseBuild).filter((b): b is FirmwareBuild => b !== null)
      if (builds.length === 0) {
        console.error('[firmware-manifest] manifest has no valid builds')
        return null
      }
      return { version: obj.version, builds }
    }

    // Legacy flat shape: treat as a single DEFAULT_SKU build.
    if (typeof obj.url !== 'string') {
      console.error('[firmware-manifest] malformed manifest: missing url')
      return null
    }
    return {
      version: obj.version,
      builds: [
        {
          sku: DEFAULT_SKU,
          url: obj.url,
          ...(typeof obj.chipFamily === 'string' ? { chipFamily: obj.chipFamily } : {}),
          ...(typeof obj.mergedUrl === 'string' ? { mergedUrl: obj.mergedUrl } : {}),
        },
      ],
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

/** Returns the build for the given SKU, or null if the manifest has none. */
export function selectBuild(
  manifest: FirmwareManifest | null,
  sku: string,
): FirmwareBuild | null {
  if (!manifest) return null
  return manifest.builds.find((b) => b.sku === sku) ?? null
}
