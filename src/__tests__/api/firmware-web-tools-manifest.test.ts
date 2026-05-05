/**
 * @jest-environment node
 */
import { GET } from '@/app/api/firmware/web-tools-manifest.json/route'

jest.mock('@/lib/firmware-manifest', () => ({
  getFirmwareManifest: jest.fn(),
}))

const { getFirmwareManifest } = jest.requireMock('@/lib/firmware-manifest')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/firmware/web-tools-manifest.json', () => {
  it('returns 503 when no manifest is cached', async () => {
    getFirmwareManifest.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(503)
  })

  it('returns 503 when chipFamily is missing', async () => {
    getFirmwareManifest.mockResolvedValue({
      version: 'v3.0.0',
      url: 'https://example.com/fw.bin',
      mergedUrl: 'https://example.com/fw-merged.bin',
    })
    const res = await GET()
    expect(res.status).toBe(503)
  })

  it('returns 503 when mergedUrl is missing', async () => {
    getFirmwareManifest.mockResolvedValue({
      version: 'v3.0.0',
      url: 'https://example.com/fw.bin',
      chipFamily: 'ESP32',
    })
    const res = await GET()
    expect(res.status).toBe(503)
  })

  it('emits an ESP Web Tools manifest when chipFamily and mergedUrl are present', async () => {
    getFirmwareManifest.mockResolvedValue({
      version: 'v3.0.0',
      url: 'https://example.com/jellybox-firmware-v3.0.0.bin',
      chipFamily: 'ESP32',
      mergedUrl: 'https://example.com/jellybox-firmware-v3.0.0-merged.bin',
    })

    const res = await GET()
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
              path: 'https://example.com/jellybox-firmware-v3.0.0-merged.bin',
              offset: 0,
            },
          ],
        },
      ],
    })
  })
})
