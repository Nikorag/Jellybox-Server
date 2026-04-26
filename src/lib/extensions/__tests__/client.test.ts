/**
 * @jest-environment node
 */
import {
  ExtensionApiError,
  authenticateComplete,
  fetchManifest,
  getClients,
  play,
  search,
} from '@/lib/extensions/client'

jest.mock('@/lib/crypto', () => ({
  decrypt: jest.fn().mockReturnValue('plaintext-secret'),
}))

const target = { baseUrl: 'https://ext.test/', secret: 'enc:secret' }

const mockFetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = mockFetch as unknown as typeof fetch
})

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('extension client', () => {
  it('fetches manifest without auth and trims trailing slash from base URL', async () => {
    const manifest = {
      name: 'Demo',
      version: '1.0.0',
      authFlow: 'credentials',
      authFields: [],
      capabilities: { search: true, listClients: true, images: false },
      itemTypes: [],
    }
    mockFetch.mockResolvedValue(jsonResponse(manifest))

    const result = await fetchManifest('https://ext.test/')
    expect(result.name).toBe('Demo')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://ext.test/manifest')
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('sends bearer secret on authenticated calls', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ accountId: 'acc-1', displayName: 'Jamie' }))

    await authenticateComplete(target, { token: 'plex-token' })

    const [, init] = mockFetch.mock.calls[0]
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer plaintext-secret')
    expect(init.body).toBe(JSON.stringify({ fields: { token: 'plex-token' } }))
  })

  it('unwraps the items array from /search', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ items: [{ id: '1', title: 'A', type: 'track' }] }))
    const items = await search(target, 'acc-1', 'hello')
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe('A')
  })

  it('unwraps the clients array from /clients', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ clients: [{ id: 'c1', name: 'Living room' }] }))
    const clients = await getClients(target, 'acc-1')
    expect(clients).toEqual([{ id: 'c1', name: 'Living room' }])
  })

  it('passes flags through to /play', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ ok: true }))
    await play(target, 'acc-1', 'item-1', 'client-1', { shuffle: true })
    const [, init] = mockFetch.mock.calls[0]
    expect(JSON.parse(init.body as string)).toEqual({
      accountId: 'acc-1',
      itemId: 'item-1',
      clientId: 'client-1',
      flags: { shuffle: true },
    })
  })

  it('throws ExtensionApiError with status code on non-2xx', async () => {
    mockFetch.mockResolvedValue(new Response('nope', { status: 401, statusText: 'Unauthorized' }))
    await expect(authenticateComplete(target, {})).rejects.toMatchObject({
      statusCode: 401,
    })
    try {
      await authenticateComplete(target, {})
    } catch (err) {
      expect(err).toBeInstanceOf(ExtensionApiError)
      expect((err as ExtensionApiError).isAuthError).toBe(true)
    }
  })

  it('marks aborted requests as unreachable', async () => {
    mockFetch.mockImplementation(() => {
      const e = new Error('aborted')
      e.name = 'AbortError'
      return Promise.reject(e)
    })
    await expect(fetchManifest('https://ext.test')).rejects.toMatchObject({
      statusCode: 0,
    })
  })

  it('wraps network errors as unreachable', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'))
    await expect(fetchManifest('https://ext.test')).rejects.toMatchObject({
      statusCode: 0,
    })
  })
})
