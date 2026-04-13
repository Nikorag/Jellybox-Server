import { POST } from '@/app/api/jellyfin/connect/route'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  db: {
    jellyfinServer: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/crypto', () => ({
  encrypt: jest.fn().mockReturnValue('encrypted-token'),
}))

jest.mock('@/lib/jellyfin', () => ({
  jellyfinAuthenticate: jest.fn(),
  jellyfinGetSystemInfo: jest.fn(),
  JellyfinApiError: class JellyfinApiError extends Error {
    statusCode: number
    constructor(statusCode: number, message: string) {
      super(message)
      this.statusCode = statusCode
    }
    get isUnreachable() { return this.statusCode === 0 }
    get isAuthError() { return this.statusCode === 401 }
  },
}))

const { auth } = jest.requireMock('@/auth')
const { db } = jest.requireMock('@/lib/db')
const { jellyfinAuthenticate, jellyfinGetSystemInfo } = jest.requireMock('@/lib/jellyfin')

const mockSession = { user: { id: 'user-1' } }

beforeEach(() => {
  jest.clearAllMocks()
  auth.mockResolvedValue(mockSession)
  db.jellyfinServer.upsert.mockResolvedValue({})
})

function makePost(body: unknown) {
  return new Request('http://localhost/api/jellyfin/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/jellyfin/connect', () => {
  it('returns 401 when unauthenticated', async () => {
    auth.mockResolvedValue(null)
    const res = await POST(makePost({ mode: 'apikey', serverUrl: 'https://jf.test', apiKey: 'abc' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid input', async () => {
    const res = await POST(makePost({ mode: 'credentials' }))
    expect(res.status).toBe(400)
  })

  it('connects via API key', async () => {
    jellyfinGetSystemInfo.mockResolvedValue({ Id: 'srv-1', ServerName: 'My Jellyfin', Version: '10' })
    const res = await POST(makePost({ mode: 'apikey', serverUrl: 'https://jf.test', apiKey: 'my-key' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.serverName).toBe('My Jellyfin')
    expect(db.jellyfinServer.upsert).toHaveBeenCalled()
  })

  it('connects via username/password', async () => {
    jellyfinAuthenticate.mockResolvedValue({ AccessToken: 'token-123', User: { Id: 'u1', Name: 'Admin' } })
    jellyfinGetSystemInfo.mockResolvedValue({ Id: 'srv-1', ServerName: 'My Jellyfin', Version: '10' })
    const res = await POST(makePost({ mode: 'credentials', serverUrl: 'https://jf.test', username: 'admin', password: 'pass' }))
    expect(res.status).toBe(200)
    expect(jellyfinAuthenticate).toHaveBeenCalledWith('https://jf.test', 'admin', 'pass')
  })

  it('returns 422 on Jellyfin error', async () => {
    const { JellyfinApiError } = jest.requireMock('@/lib/jellyfin')
    jellyfinGetSystemInfo.mockRejectedValue(new JellyfinApiError(0, 'Timeout'))
    const res = await POST(makePost({ mode: 'apikey', serverUrl: 'https://jf.test', apiKey: 'key' }))
    expect(res.status).toBe(422)
  })
})
