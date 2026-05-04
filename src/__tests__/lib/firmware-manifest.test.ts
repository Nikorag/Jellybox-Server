/**
 * @jest-environment node
 */
import {
  __resetFirmwareManifestForTests,
  getCachedFirmwareManifest,
  getFirmwareManifestUrl,
  refreshFirmwareManifest,
} from '@/lib/firmware-manifest'

const originalFetch = global.fetch
const originalConsoleError = console.error
const originalRepo = process.env.FIRMWARE_REPO
const originalVersion = process.env.FIRMWARE_VERSION

function mockFetchOnce(impl: () => Promise<Response> | Response) {
  ;(global.fetch as jest.Mock).mockImplementationOnce(impl)
}

function jsonResponse(body: unknown, init: { status?: number } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  __resetFirmwareManifestForTests()
  global.fetch = jest.fn() as unknown as typeof fetch
  console.error = jest.fn()
  delete process.env.FIRMWARE_REPO
  delete process.env.FIRMWARE_VERSION
})

afterAll(() => {
  global.fetch = originalFetch
  console.error = originalConsoleError
  if (originalRepo === undefined) delete process.env.FIRMWARE_REPO
  else process.env.FIRMWARE_REPO = originalRepo
  if (originalVersion === undefined) delete process.env.FIRMWARE_VERSION
  else process.env.FIRMWARE_VERSION = originalVersion
})

describe('refreshFirmwareManifest', () => {
  it('populates the cache from a valid manifest', async () => {
    mockFetchOnce(() =>
      jsonResponse({
        version: 'v0.0.2',
        url: 'https://example.com/firmware-v0.0.2.bin',
        sha256: 'abc',
        size: 123,
        released_at: '2026-05-03T20:00:00Z',
      }),
    )

    const result = await refreshFirmwareManifest()
    expect(result).toEqual({
      version: 'v0.0.2',
      url: 'https://example.com/firmware-v0.0.2.bin',
    })
    expect(getCachedFirmwareManifest()).toEqual(result)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://github.com/Nikorag/Jellybox-Firmware/releases/latest/download/manifest.json',
      expect.any(Object),
    )
  })

  it('passes chipFamily and mergedUrl through when the upstream manifest provides them', async () => {
    mockFetchOnce(() =>
      jsonResponse({
        version: 'v3.0.0',
        url: 'https://example.com/jellybox-firmware-v3.0.0.bin',
        chipFamily: 'ESP32',
        mergedUrl: 'https://example.com/jellybox-firmware-v3.0.0-merged.bin',
      }),
    )

    const result = await refreshFirmwareManifest()
    expect(result).toEqual({
      version: 'v3.0.0',
      url: 'https://example.com/jellybox-firmware-v3.0.0.bin',
      chipFamily: 'ESP32',
      mergedUrl: 'https://example.com/jellybox-firmware-v3.0.0-merged.bin',
    })
  })

  it('strips informational fields it does not understand', async () => {
    mockFetchOnce(() =>
      jsonResponse({
        version: 'v1.2.3',
        url: 'https://example.com/fw.bin',
        sha256: 'deadbeef',
        size: 999,
        released_at: '2026-05-03T20:00:00Z',
      }),
    )

    await refreshFirmwareManifest()
    expect(getCachedFirmwareManifest()).toEqual({
      version: 'v1.2.3',
      url: 'https://example.com/fw.bin',
    })
  })

  it('ignores chipFamily and mergedUrl when they are not strings', async () => {
    mockFetchOnce(() =>
      jsonResponse({
        version: 'v1.2.3',
        url: 'https://example.com/fw.bin',
        chipFamily: 42,
        mergedUrl: null,
      }),
    )

    await refreshFirmwareManifest()
    expect(getCachedFirmwareManifest()).toEqual({
      version: 'v1.2.3',
      url: 'https://example.com/fw.bin',
    })
  })

  it('keeps the previous cached manifest when fetch throws', async () => {
    mockFetchOnce(() => jsonResponse({ version: 'v0.0.1', url: 'https://example.com/a.bin' }))
    await refreshFirmwareManifest()
    expect(getCachedFirmwareManifest()).toEqual({
      version: 'v0.0.1',
      url: 'https://example.com/a.bin',
    })

    mockFetchOnce(() => Promise.reject(new Error('network down')))
    const result = await refreshFirmwareManifest()
    expect(result).toEqual({ version: 'v0.0.1', url: 'https://example.com/a.bin' })
    expect(getCachedFirmwareManifest()).toEqual({
      version: 'v0.0.1',
      url: 'https://example.com/a.bin',
    })
  })

  it('keeps the previous cached manifest on non-2xx responses', async () => {
    mockFetchOnce(() => jsonResponse({ version: 'v0.0.1', url: 'https://example.com/a.bin' }))
    await refreshFirmwareManifest()

    mockFetchOnce(() => new Response('Not Found', { status: 404 }))
    await refreshFirmwareManifest()
    expect(getCachedFirmwareManifest()).toEqual({
      version: 'v0.0.1',
      url: 'https://example.com/a.bin',
    })
  })

  it('does not poison the cache when JSON is malformed', async () => {
    mockFetchOnce(() => jsonResponse({ version: 'v0.0.1', url: 'https://example.com/a.bin' }))
    await refreshFirmwareManifest()

    mockFetchOnce(() => new Response('not json', { status: 200 }))
    await refreshFirmwareManifest()
    expect(getCachedFirmwareManifest()).toEqual({
      version: 'v0.0.1',
      url: 'https://example.com/a.bin',
    })
  })

  it('rejects manifests missing required fields', async () => {
    mockFetchOnce(() => jsonResponse({ url: 'https://example.com/a.bin' }))
    const result = await refreshFirmwareManifest()
    expect(result).toBeNull()
    expect(getCachedFirmwareManifest()).toBeNull()
  })

  it('returns null on cold start when fetch fails before any success', async () => {
    mockFetchOnce(() => Promise.reject(new Error('boom')))
    const result = await refreshFirmwareManifest()
    expect(result).toBeNull()
    expect(getCachedFirmwareManifest()).toBeNull()
  })
})

describe('getFirmwareManifestUrl', () => {
  it('defaults to the Nikorag repo and the latest release', () => {
    expect(getFirmwareManifestUrl()).toBe(
      'https://github.com/Nikorag/Jellybox-Firmware/releases/latest/download/manifest.json',
    )
  })

  it('honours FIRMWARE_REPO for forks', () => {
    process.env.FIRMWARE_REPO = 'someone/Their-Firmware'
    expect(getFirmwareManifestUrl()).toBe(
      'https://github.com/someone/Their-Firmware/releases/latest/download/manifest.json',
    )
  })

  it('pins to a specific tag when FIRMWARE_VERSION is set', () => {
    process.env.FIRMWARE_VERSION = 'v0.0.2'
    expect(getFirmwareManifestUrl()).toBe(
      'https://github.com/Nikorag/Jellybox-Firmware/releases/download/v0.0.2/manifest.json',
    )
  })

  it('combines a custom repo and pinned version', () => {
    process.env.FIRMWARE_REPO = 'someone/Their-Firmware'
    process.env.FIRMWARE_VERSION = 'v1.2.3'
    expect(getFirmwareManifestUrl()).toBe(
      'https://github.com/someone/Their-Firmware/releases/download/v1.2.3/manifest.json',
    )
  })

  it('treats FIRMWARE_VERSION="latest" the same as unset', () => {
    process.env.FIRMWARE_VERSION = 'latest'
    expect(getFirmwareManifestUrl()).toBe(
      'https://github.com/Nikorag/Jellybox-Firmware/releases/latest/download/manifest.json',
    )
  })
})
