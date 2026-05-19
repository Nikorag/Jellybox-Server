/**
 * @jest-environment node
 */
import { GET } from '@/app/api/firmware/web-tools-manifest.json/route'

jest.mock('@/lib/firmware-manifest', () => {
  const actual = jest.requireActual('@/lib/firmware-manifest')
  return {
    ...actual,
    getFirmwareManifest: jest.fn(),
  }
})

const { getFirmwareManifest } = jest.requireMock('@/lib/firmware-manifest')

function req(url = 'http://localhost/api/firmware/web-tools-manifest.json'): Request {
  return new Request(url)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/firmware/web-tools-manifest.json', () => {
  it('returns 503 when no manifest is cached', async () => {
    getFirmwareManifest.mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(503)
  })

  it('returns 503 when chipFamily is missing on the matching build', async () => {
    getFirmwareManifest.mockResolvedValue({
      version: 'v3.0.0',
      builds: [
        {
          sku: 'jb-eink-v1',
          url: 'https://example.com/fw.bin',
          mergedUrl: 'https://example.com/fw-merged.bin',
        },
      ],
    })
    const res = await GET(req())
    expect(res.status).toBe(503)
  })

  it('returns 503 when mergedUrl is missing on the matching build', async () => {
    getFirmwareManifest.mockResolvedValue({
      version: 'v3.0.0',
      builds: [
        {
          sku: 'jb-eink-v1',
          url: 'https://example.com/fw.bin',
          chipFamily: 'ESP32',
        },
      ],
    })
    const res = await GET(req())
    expect(res.status).toBe(503)
  })

  it('returns 503 when no build matches the requested SKU', async () => {
    getFirmwareManifest.mockResolvedValue({
      version: 'v3.0.0',
      builds: [
        {
          sku: 'jb-future-v1',
          url: 'https://example.com/fw.bin',
          chipFamily: 'ESP32',
          mergedUrl: 'https://example.com/fw-merged.bin',
        },
      ],
    })
    const res = await GET(req('http://localhost/api/firmware/web-tools-manifest.json?sku=jb-eink-v1'))
    expect(res.status).toBe(503)
  })

  it('emits an ESP Web Tools manifest for the default SKU when no sku param is given', async () => {
    getFirmwareManifest.mockResolvedValue({
      version: 'v3.0.0',
      builds: [
        {
          sku: 'jb-eink-v1',
          url: 'https://example.com/jellybox-firmware-jb-eink-v1-v3.0.0.bin',
          chipFamily: 'ESP32',
          mergedUrl: 'https://example.com/jellybox-firmware-jb-eink-v1-v3.0.0-merged.bin',
        },
      ],
    })

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')

    const body = await res.json()
    expect(body).toEqual({
      name: 'Jellybox',
      version: 'v3.0.0',
      builds: [
        {
          chipFamily: 'ESP32',
          parts: [
            {
              path: 'https://example.com/jellybox-firmware-jb-eink-v1-v3.0.0-merged.bin',
              offset: 0,
            },
          ],
        },
      ],
    })
  })

  it('selects the build matching ?sku=', async () => {
    getFirmwareManifest.mockResolvedValue({
      version: 'v3.0.0',
      builds: [
        {
          sku: 'jb-eink-v1',
          url: 'https://example.com/eink.bin',
          chipFamily: 'ESP32',
          mergedUrl: 'https://example.com/eink-merged.bin',
        },
      ],
    })

    const res = await GET(
      req('http://localhost/api/firmware/web-tools-manifest.json?sku=jb-eink-v1'),
    )
    const body = await res.json()
    expect(body.builds[0].parts[0].path).toBe('https://example.com/eink-merged.bin')
  })

  it('falls back to the default SKU for unknown values', async () => {
    getFirmwareManifest.mockResolvedValue({
      version: 'v3.0.0',
      builds: [
        {
          sku: 'jb-eink-v1',
          url: 'https://example.com/eink.bin',
          chipFamily: 'ESP32',
          mergedUrl: 'https://example.com/eink-merged.bin',
        },
      ],
    })

    const res = await GET(
      req('http://localhost/api/firmware/web-tools-manifest.json?sku=jb-bogus'),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.builds[0].parts[0].path).toBe('https://example.com/eink-merged.bin')
  })
})
