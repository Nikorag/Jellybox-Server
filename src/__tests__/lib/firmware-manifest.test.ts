/**
 * @jest-environment node
 */
import {
  fetchFirmwareManifest,
  getFirmwareManifestUrl,
  selectBuild,
  type FirmwareManifest,
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
  it('wraps a legacy flat manifest as a single jb-eink-v1 build', async () => {
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
      builds: [
        {
          sku: 'jb-eink-v1',
          url: 'https://example.com/firmware-v0.0.2.bin',
        },
      ],
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://github.com/Nikorag/Jellybox-Firmware/releases/latest/download/manifest.json',
      expect.any(Object),
    )
  })

  it('passes chipFamily and mergedUrl through on legacy manifests', async () => {
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
      builds: [
        {
          sku: 'jb-eink-v1',
          url: 'https://example.com/jellybox-firmware-v3.0.0.bin',
          chipFamily: 'ESP32',
          mergedUrl: 'https://example.com/jellybox-firmware-v3.0.0-merged.bin',
        },
      ],
    })
  })

  it('parses a new builds[] manifest', async () => {
    mockFetchOnce(() =>
      jsonResponse({
        version: 'v0.2.0',
        released_at: '2026-06-01T00:00:00Z',
        builds: [
          {
            sku: 'jb-eink-v1',
            chipFamily: 'ESP32',
            url: 'https://example.com/fw-jb-eink-v1-v0.2.0.bin',
            mergedUrl: 'https://example.com/fw-jb-eink-v1-v0.2.0.merged.bin',
            sha256: 'aaa',
            size: 100,
          },
          {
            sku: 'jb-future-v1',
            chipFamily: 'ESP32',
            url: 'https://example.com/fw-jb-future-v1-v0.2.0.bin',
          },
        ],
      }),
    )

    expect(await fetchFirmwareManifest()).toEqual({
      version: 'v0.2.0',
      builds: [
        {
          sku: 'jb-eink-v1',
          chipFamily: 'ESP32',
          url: 'https://example.com/fw-jb-eink-v1-v0.2.0.bin',
          mergedUrl: 'https://example.com/fw-jb-eink-v1-v0.2.0.merged.bin',
        },
        {
          sku: 'jb-future-v1',
          chipFamily: 'ESP32',
          url: 'https://example.com/fw-jb-future-v1-v0.2.0.bin',
        },
      ],
    })
  })

  it('ignores invalid entries in builds[] but returns the valid ones', async () => {
    mockFetchOnce(() =>
      jsonResponse({
        version: 'v0.2.0',
        builds: [
          { sku: 'jb-eink-v1', url: 'https://example.com/ok.bin' },
          { sku: 'no-url' },
          'not an object',
          null,
        ],
      }),
    )

    expect(await fetchFirmwareManifest()).toEqual({
      version: 'v0.2.0',
      builds: [{ sku: 'jb-eink-v1', url: 'https://example.com/ok.bin' }],
    })
  })

  it('returns null when builds[] is present but empty after filtering', async () => {
    mockFetchOnce(() =>
      jsonResponse({
        version: 'v0.2.0',
        builds: [{ sku: 42 }, 'nope'],
      }),
    )
    expect(await fetchFirmwareManifest()).toBeNull()
  })

  it('ignores chipFamily and mergedUrl when they are not strings (legacy)', async () => {
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
      builds: [{ sku: 'jb-eink-v1', url: 'https://example.com/fw.bin' }],
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

  it('returns null when version is missing', async () => {
    mockFetchOnce(() => jsonResponse({ url: 'https://example.com/a.bin' }))
    expect(await fetchFirmwareManifest()).toBeNull()
  })

  it('returns null when neither builds[] nor url is present', async () => {
    mockFetchOnce(() => jsonResponse({ version: 'v1.0.0' }))
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

describe('selectBuild', () => {
  const manifest: FirmwareManifest = {
    version: 'v0.2.0',
    builds: [
      { sku: 'jb-eink-v1', url: 'https://example.com/eink.bin' },
      // @ts-expect-error — exercising an unknown SKU at runtime
      { sku: 'jb-future-v1', url: 'https://example.com/future.bin' },
    ],
  }

  it('returns the build matching the SKU', () => {
    expect(selectBuild(manifest, 'jb-eink-v1')).toEqual({
      sku: 'jb-eink-v1',
      url: 'https://example.com/eink.bin',
    })
  })

  it('returns null when no build matches', () => {
    expect(selectBuild(manifest, 'jb-missing-v1')).toBeNull()
  })

  it('returns null when manifest is null', () => {
    expect(selectBuild(null, 'jb-eink-v1')).toBeNull()
  })
})
