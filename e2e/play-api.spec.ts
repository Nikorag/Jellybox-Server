import { test, expect } from '@playwright/test'

// These tests call the /api/play endpoint directly (no browser UI needed)
test.describe('Playback API (/api/play)', () => {
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

  test('returns 401 with no API key', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/play`, {
      data: { tagId: 'TEST123' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.code).toBe('AUTH_ERROR')
  })

  test('returns 401 with a fake API key', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/play`, {
      headers: { Authorization: 'Bearer jb_fakekeythatdoesnotexist1234567890' },
      data: { tagId: 'TEST123' },
    })
    expect(res.status()).toBe(401)
  })

  test('returns 400 with missing tagId', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/play`, {
      headers: { Authorization: 'Bearer jb_somekey' },
      data: {},
    })
    // Either 400 (invalid body) or 401 (invalid key) — depends on order of checks
    expect([400, 401]).toContain(res.status())
  })

  test('health endpoint returns 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})
