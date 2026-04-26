/**
 * @jest-environment node
 */
import { POST } from '@/app/api/play/route'
import { PLAY_ERROR } from '@/lib/constants'

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('@/lib/db', () => ({
  db: {
    device: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    rfidTag: { findFirst: jest.fn() },
    jellyfinServer: { findUnique: jest.fn() },
    extension: { findUnique: jest.fn() },
    extensionAccount: { findUnique: jest.fn() },
    webhook: { findMany: jest.fn().mockResolvedValue([]) },
    activityLog: {
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}))

jest.mock('@/lib/crypto', () => ({
  verifySecret: jest.fn(),
  decrypt: jest.fn().mockReturnValue('mock-api-token'),
}))

jest.mock('@/lib/jellyfin', () => ({
  jellyfinGetSessions: jest.fn(),
  jellyfinPlay: jest.fn(),
  JellyfinApiError: class JellyfinApiError extends Error {
    statusCode: number
    constructor(statusCode: number, message: string) {
      super(message)
      this.statusCode = statusCode
    }
    get isAuthError() { return this.statusCode === 401 }
    get isUnreachable() { return this.statusCode === 0 }
  },
}))

jest.mock('@/lib/extensions/client', () => ({
  play: jest.fn(),
  ExtensionApiError: class ExtensionApiError extends Error {
    statusCode: number
    constructor(statusCode: number, message: string) {
      super(message)
      this.statusCode = statusCode
    }
    get isAuthError() { return this.statusCode === 401 }
    get isUnreachable() { return this.statusCode === 0 }
  },
}))

const { db } = jest.requireMock('@/lib/db')
const { verifySecret } = jest.requireMock('@/lib/crypto')
const { jellyfinGetSessions, jellyfinPlay } = jest.requireMock('@/lib/jellyfin')
const { play: extensionPlay } = jest.requireMock('@/lib/extensions/client')

function makeRequest(body: unknown, apiKey?: string) {
  return new Request('http://localhost/api/play', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

const mockDevice = {
  id: 'device-1',
  name: 'Test Box',
  apiKeyHash: '$2b$12$hash',
  apiKeyPrefix: 'jb_testkey',
  defaultClientId: 'client-1',
  defaultClient: { id: 'client-1', jellyfinDeviceId: 'jf-device-1', deviceName: 'TV' },
  user: { id: 'user-1' },
}

const mockTag = {
  id: 'tag-1',
  jellyfinItemId: 'item-1',
  jellyfinItemTitle: 'The Silver Paw',
}

const mockServer = {
  id: 'server-1',
  serverUrl: 'https://jellyfin.example.com',
  apiToken: 'encrypted-token',
}

beforeEach(() => {
  jest.clearAllMocks()
  db.activityLog.count.mockResolvedValue(0)
  db.activityLog.create.mockResolvedValue({})
  db.device.update.mockResolvedValue({})
})

describe('POST /api/play', () => {
  it('returns 401 with no API key', async () => {
    const req = makeRequest({ tagId: 'A1B2C3D4' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.code).toBe(PLAY_ERROR.AUTH_ERROR)
  })

  it('returns 401 with invalid API key', async () => {
    db.device.findMany.mockResolvedValue([mockDevice])
    verifySecret.mockResolvedValue(false)
    const req = makeRequest({ tagId: 'A1B2C3D4' }, 'jb_badkey1234567890')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 when tag has no content assigned', async () => {
    db.device.findMany.mockResolvedValue([mockDevice])
    verifySecret.mockResolvedValue(true)
    db.rfidTag.findFirst.mockResolvedValue({ id: 'tag-1', jellyfinItemId: null })
    const req = makeRequest({ tagId: 'A1B2C3D4' }, 'jb_validkey1234567890')
    const res = await POST(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.code).toBe(PLAY_ERROR.UNASSIGNED)
  })

  it('returns 503 when client is not in active sessions', async () => {
    db.device.findMany.mockResolvedValue([mockDevice])
    verifySecret.mockResolvedValue(true)
    db.rfidTag.findFirst.mockResolvedValue(mockTag)
    db.jellyfinServer.findUnique.mockResolvedValue(mockServer)
    jellyfinGetSessions.mockResolvedValue([]) // no active sessions
    const req = makeRequest({ tagId: 'A1B2C3D4' }, 'jb_validkey1234567890')
    const res = await POST(req)
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe(PLAY_ERROR.OFFLINE)
  })

  it('returns 200 on successful playback', async () => {
    db.device.findMany.mockResolvedValue([mockDevice])
    verifySecret.mockResolvedValue(true)
    db.rfidTag.findFirst.mockResolvedValue(mockTag)
    db.jellyfinServer.findUnique.mockResolvedValue(mockServer)
    jellyfinGetSessions.mockResolvedValue([
      { Id: 'session-1', DeviceId: 'jf-device-1', DeviceName: 'TV', LastActivityDate: new Date().toISOString() },
    ])
    jellyfinPlay.mockResolvedValue(undefined)

    const req = makeRequest({ tagId: 'A1B2C3D4' }, 'jb_validkey1234567890')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.content).toBe('The Silver Paw')
    expect(db.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ success: true }) }),
    )
  })

  it('returns 429 when rate limit is exceeded', async () => {
    db.device.findMany.mockResolvedValue([mockDevice])
    verifySecret.mockResolvedValue(true)
    db.activityLog.count.mockResolvedValue(100) // over limit
    const req = makeRequest({ tagId: 'A1B2C3D4' }, 'jb_validkey1234567890')
    const res = await POST(req)
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe(PLAY_ERROR.RATE_LIMITED)
  })

  describe('extension-backed tags', () => {
    const extensionTag = {
      id: 'tag-2',
      jellyfinItemId: null,
      jellyfinItemType: null,
      jellyfinItemTitle: null,
      extensionId: 'ext-1',
      externalItemId: 'demo-item-1',
      externalItemType: 'film',
      externalItemTitle: 'Demo Film',
      resumePlayback: false,
      shuffle: false,
    }

    const mockExtension = {
      id: 'ext-1',
      name: 'Demo',
      baseUrl: 'http://ext',
      secret: 'enc',
      manifest: { capabilities: { listClients: true } },
      addedByUserId: null,
    }

    const mockAccount = {
      id: 'acc-row',
      extensionId: 'ext-1',
      userId: 'user-1',
      accountId: 'demo-account',
      displayName: 'Demo',
      defaultClientId: 'demo-client',
    }

    beforeEach(() => {
      db.device.findMany.mockResolvedValue([mockDevice])
      verifySecret.mockResolvedValue(true)
      db.rfidTag.findFirst.mockResolvedValue(extensionTag)
    })

    it('forwards play to the extension when the tag is extension-backed', async () => {
      db.extension.findUnique.mockResolvedValue(mockExtension)
      db.extensionAccount.findUnique.mockResolvedValue(mockAccount)
      extensionPlay.mockResolvedValue({ ok: true })

      const res = await POST(makeRequest({ tagId: 'A1B2C3D4' }, 'jb_validkey1234567890'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.content).toBe('Demo Film')
      // Account is resolved by (extensionId, deviceOwner.userId).
      expect(db.extensionAccount.findUnique).toHaveBeenCalledWith({
        where: { extensionId_userId: { extensionId: 'ext-1', userId: 'user-1' } },
      })
      expect(extensionPlay).toHaveBeenCalledWith(
        mockExtension,
        'demo-account',
        'demo-item-1',
        'demo-client',
        { resumePlayback: false, shuffle: false },
      )
      // Jellyfin path must not be touched.
      expect(jellyfinGetSessions).not.toHaveBeenCalled()
      expect(jellyfinPlay).not.toHaveBeenCalled()
    })

    it('maps extension OFFLINE to PLAY_ERROR.OFFLINE', async () => {
      db.extension.findUnique.mockResolvedValue(mockExtension)
      db.extensionAccount.findUnique.mockResolvedValue(mockAccount)
      extensionPlay.mockResolvedValue({ ok: false, code: 'OFFLINE', message: 'Device offline' })

      const res = await POST(makeRequest({ tagId: 'A1B2C3D4' }, 'jb_validkey1234567890'))
      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.code).toBe(PLAY_ERROR.OFFLINE)
    })

    it('returns NO_CLIENT when the user has no default client', async () => {
      db.extension.findUnique.mockResolvedValue(mockExtension)
      db.extensionAccount.findUnique.mockResolvedValue({ ...mockAccount, defaultClientId: null })

      const res = await POST(makeRequest({ tagId: 'A1B2C3D4' }, 'jb_validkey1234567890'))
      expect(res.status).toBe(422)
      const body = await res.json()
      expect(body.code).toBe(PLAY_ERROR.NO_CLIENT)
      expect(extensionPlay).not.toHaveBeenCalled()
    })

    it('returns OFFLINE when the user is not connected to the extension', async () => {
      db.extension.findUnique.mockResolvedValue(mockExtension)
      db.extensionAccount.findUnique.mockResolvedValue(null)

      const res = await POST(makeRequest({ tagId: 'A1B2C3D4' }, 'jb_validkey1234567890'))
      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.code).toBe(PLAY_ERROR.OFFLINE)
    })
  })
})
