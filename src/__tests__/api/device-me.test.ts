/**
 * @jest-environment node
 */
import { GET } from '@/app/api/device/me/route'

jest.mock('@/lib/db', () => ({
  db: {
    device: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/crypto', () => ({
  verifySecret: jest.fn(),
}))

jest.mock('@/lib/firmware-manifest', () => ({
  getCachedFirmwareManifest: jest.fn(),
}))

const { db } = jest.requireMock('@/lib/db')
const { verifySecret } = jest.requireMock('@/lib/crypto')
const { getCachedFirmwareManifest } = jest.requireMock('@/lib/firmware-manifest')

const mockDevice = {
  id: 'device-1',
  name: 'Living Room Box',
  apiKeyHash: '$2b$12$hash',
  apiKeyPrefix: 'jb_testkey',
  scanModeToken: null,
  scanModeExpiresAt: null,
}

function makeRequest(apiKey?: string) {
  return new Request('http://localhost/api/device/me', {
    method: 'GET',
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  db.device.update.mockResolvedValue({})
})

describe('GET /api/device/me', () => {
  it('returns 401 when no API key is provided', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when the API key is invalid', async () => {
    db.device.findMany.mockResolvedValue([mockDevice])
    verifySecret.mockResolvedValue(false)
    const res = await GET(makeRequest('jb_badkey1234567890'))
    expect(res.status).toBe(401)
  })

  it('omits latestFirmware when the manifest cache is empty', async () => {
    db.device.findMany.mockResolvedValue([mockDevice])
    verifySecret.mockResolvedValue(true)
    getCachedFirmwareManifest.mockReturnValue(null)

    const res = await GET(makeRequest('jb_validkey1234567890'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ name: 'Living Room Box', scanMode: false })
    expect(body).not.toHaveProperty('latestFirmware')
  })

  it('includes latestFirmware (version + url only) when the manifest is cached', async () => {
    db.device.findMany.mockResolvedValue([mockDevice])
    verifySecret.mockResolvedValue(true)
    getCachedFirmwareManifest.mockReturnValue({
      version: 'v0.0.2',
      url: 'https://example.com/jellybox-firmware-v0.0.2.bin',
      chipFamily: 'ESP32',
      mergedUrl: 'https://example.com/jellybox-firmware-v0.0.2-merged.bin',
    })

    const res = await GET(makeRequest('jb_validkey1234567890'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      name: 'Living Room Box',
      scanMode: false,
      latestFirmware: {
        version: 'v0.0.2',
        url: 'https://example.com/jellybox-firmware-v0.0.2.bin',
      },
    })
    // chipFamily and mergedUrl are for the web flasher only — must not reach devices.
    expect(Object.keys(body.latestFirmware)).toEqual(['version', 'url'])
  })

  it('reflects scanMode when a valid scan token is set', async () => {
    db.device.findMany.mockResolvedValue([
      {
        ...mockDevice,
        scanModeToken: 'tok',
        scanModeExpiresAt: new Date(Date.now() + 60_000),
      },
    ])
    verifySecret.mockResolvedValue(true)
    getCachedFirmwareManifest.mockReturnValue(null)

    const res = await GET(makeRequest('jb_validkey1234567890'))
    const body = await res.json()
    expect(body.scanMode).toBe(true)
  })
})
