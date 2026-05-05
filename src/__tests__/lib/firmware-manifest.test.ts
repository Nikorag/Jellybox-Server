/**
 * @jest-environment node
 */
import { fetchFirmwareManifest, getFirmwareManifestUrl } from '@/lib/firmware-manifest'

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

describe('fetchFirmwareManifest', () => {
  it('returns a parsed manifest from a valid response', async () => {
    mockFetchOnce(() =>
      jsonResponse({
        version: 'v0.0.2',
        url: 'https://example.com/firmware-v0.0.2.bin',
        sha256: 'abc',
        size: 123,
        released_at: '2026-05-03T20:00:00Z',
      }),
    )

    const result = await fetchFirmwareManifest()
    expect(result).toEqual({
      version: 'v0.0.2',
      url: 'https://example.com/firmware-v0.0.2.bin',
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://github.com/Nikorag/Jellybox-Firmware/releases/latest/download/manifest.json',
      expect.any(Object),
    )
  })

  it('passes chipFamily and mergedUrl through when present', async () => {
    mockFetchOnce(() =>
      jsonResponse({
        version: 'v3.0.0',
        url: 'https://example.com/jellybox-firmware-v3.0.0.bin',
        chipFamily: 'ESP32',
        mergedUrl: 'https://example.com/jellybox-firmware-v3.0.0-merged.bin',
      }),
    )

    expect(await fetchFirmwareManifest()).toEqual({
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

    expect(await fetchFirmwareManifest()).toEqual({
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

    expect(await fetchFirmwareManifest()).toEqual({
      version: 'v1.2.3',
      url: 'https://example.com/fw.bin',
    })
  })

  it('returns null on non-2xx responses', async () => {
    mockFetchOnce(() => new Response('Not Found', { status: 404 }))
    expect(await fetchFirmwareManifest()).toBeNull()
  })

  it('returns null on malformed JSON', async () => {
    mockFetchOnce(() => new Response('not json', { status: 200 }))
    expect(await fetchFirmwareManifest()).toBeNull()
  })

  it('returns null when required fields are missing', async () => {
    mockFetchOnce(() => jsonResponse({ url: 'https://example.com/a.bin' }))
    expect(await fetchFirmwareManifest()).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    mockFetchOnce(() => Promise.reject(new Error('boom')))
    expect(await fetchFirmwareManifest()).toBeNull()
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
