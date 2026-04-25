// Reference Jellybox extension. Implements the full v1 contract with canned
// data so the round-trip register → connect → play can be exercised end-to-end
// without needing a real third-party provider.
//
// Run: `node server.mjs` (listens on PORT, default 4555).
// Set AUTH_FLOW=oauth to exercise the OAuth flow instead of credentials.
//
// Bearer secret: every protected route accepts any non-empty Authorization
// header. A real extension would verify it, but this server is for local dev.

import { createServer } from 'node:http'

const PORT = Number(process.env.PORT ?? 4555)
const AUTH_FLOW = process.env.AUTH_FLOW === 'oauth' ? 'oauth' : 'credentials'
const EXPECTED_FIELD = 'demoToken'
const ACCOUNT = { accountId: 'demo-account', displayName: 'Demo User' }
const CLIENT = { id: 'demo-client', name: 'Demo screen' }
const ITEM = {
  id: 'demo-item-1',
  title: 'Demo Film',
  subtitle: 'Reference Extension',
  type: 'film',
}

const MANIFEST = {
  name: AUTH_FLOW === 'oauth' ? 'Reference OAuth Extension' : 'Reference Extension',
  version: '0.1.0',
  authFlow: AUTH_FLOW,
  authFields:
    AUTH_FLOW === 'credentials'
      ? [{ key: EXPECTED_FIELD, label: 'Demo token', secret: true, required: true }]
      : [],
  capabilities: { search: true, listClients: true, images: false },
  itemTypes: ['film'],
}

// In-memory store of pending OAuth flows: state → callbackUrl. Real
// extensions would persist this; for the reference it's transient.
const oauthPending = new Map()
const FAKE_AUTH_CODE = 'demo-code'

function send(res, status, body) {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  })
  res.end(json)
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => {
      if (!data) return resolve({})
      try { resolve(JSON.parse(data)) } catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

function requireBearer(req, res) {
  const auth = req.headers['authorization']
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    send(res, 401, { error: 'Missing bearer token' })
    return false
  }
  return true
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname

  console.log(`[ref-ext] ${req.method} ${path}`)

  // Public — no auth required.
  if (req.method === 'GET' && path === '/manifest') {
    return send(res, 200, MANIFEST)
  }

  // Fake OAuth provider screen — public, since real OAuth providers are too.
  // In this reference the extension hosts both the provider stand-in and the
  // /authenticate/exchange endpoint; a real extension would point users at
  // e.g. https://accounts.spotify.com/authorize and never serve a UI itself.
  if (req.method === 'GET' && path === '/fake-oauth') {
    const state = url.searchParams.get('state')
    const cb = url.searchParams.get('callbackUrl')
    if (!state || !cb) {
      return send(res, 400, { error: 'Missing state or callbackUrl' })
    }
    const html = `<!doctype html><meta charset="utf-8"><title>Reference OAuth</title>
<style>body{font:14px system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#111;color:#eee}
.card{background:#1c1c1c;padding:24px;border-radius:8px;max-width:320px;text-align:center}
button{margin:6px;padding:8px 16px;border-radius:6px;border:1px solid #444;background:#222;color:#eee;cursor:pointer}
button.primary{background:#3b82f6;border-color:#3b82f6;color:#fff}</style>
<div class="card">
  <p>Reference Extension wants to access your demo account.</p>
  <form method="GET" action="/fake-oauth/decision">
    <input type="hidden" name="state" value="${state}">
    <input type="hidden" name="cb" value="${encodeURIComponent(cb)}">
    <button type="submit" name="decision" value="allow" class="primary">Allow</button>
    <button type="submit" name="decision" value="deny">Deny</button>
  </form>
</div>`
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(html)
  }

  // The fake provider redirects here directly to Jellybox's callback, with
  // state + code (or error). In a real OAuth flow this redirect would happen
  // on the OAuth provider's side, not the extension's.
  if (req.method === 'GET' && path === '/fake-oauth/decision') {
    const state = url.searchParams.get('state')
    const cb = decodeURIComponent(url.searchParams.get('cb') ?? '')
    const decision = url.searchParams.get('decision')
    if (!state || !cb) return send(res, 400, { error: 'Missing state or cb' })
    const target = new URL(cb)
    if (decision === 'allow') {
      target.searchParams.set('state', state)
      target.searchParams.set('code', FAKE_AUTH_CODE)
    } else {
      target.searchParams.set('error', 'access_denied')
      target.searchParams.set('error_description', 'User denied access.')
    }
    res.writeHead(302, { Location: target.toString() })
    return res.end()
  }

  if (!requireBearer(req, res)) return

  if (req.method === 'POST' && path === '/authenticate/start') {
    if (AUTH_FLOW !== 'oauth') return send(res, 400, { error: 'Not an OAuth extension' })
    let body
    try { body = await readJson(req) } catch { return send(res, 400, { error: 'Bad JSON' }) }
    const { state, callbackUrl } = body ?? {}
    if (!state || !callbackUrl) {
      return send(res, 400, { error: 'Missing state or callbackUrl' })
    }
    oauthPending.set(state, callbackUrl)
    // "OAuth provider URL" — the user is sent here. A real extension would
    // construct e.g. https://accounts.spotify.com/authorize?... with
    // redirect_uri=callbackUrl and state baked in.
    const base = `http://localhost:${PORT}/fake-oauth`
    const params = new URLSearchParams({ state, callbackUrl })
    return send(res, 200, { redirectUrl: `${base}?${params}` })
  }

  if (req.method === 'POST' && path === '/authenticate/exchange') {
    if (AUTH_FLOW !== 'oauth') return send(res, 400, { error: 'Not an OAuth extension' })
    let body
    try { body = await readJson(req) } catch { return send(res, 400, { error: 'Bad JSON' }) }
    const { code, callbackUrl } = body ?? {}
    if (!code || !callbackUrl) {
      return send(res, 400, { error: 'Missing code or callbackUrl' })
    }
    if (code !== FAKE_AUTH_CODE) {
      return send(res, 401, { error: 'Bad code' })
    }
    // Real extensions would POST to the provider's token endpoint here with
    // their client_id/client_secret + code + redirect_uri, then store the
    // returned access/refresh tokens keyed by the accountId they hand back.
    return send(res, 200, ACCOUNT)
  }

  if (req.method === 'POST' && path === '/authenticate/complete') {
    let body
    try { body = await readJson(req) } catch { return send(res, 400, { error: 'Bad JSON' }) }
    const fields = body?.fields ?? {}
    if (!fields[EXPECTED_FIELD]) {
      return send(res, 422, { error: `Missing field: ${EXPECTED_FIELD}` })
    }
    return send(res, 200, ACCOUNT)
  }

  if (req.method === 'POST' && path === '/search') {
    const body = await readJson(req).catch(() => ({}))
    if (body?.accountId !== ACCOUNT.accountId) {
      return send(res, 401, { error: 'Unknown account' })
    }
    return send(res, 200, { items: [ITEM] })
  }

  if (req.method === 'GET' && path === '/item') {
    if (url.searchParams.get('itemId') !== ITEM.id) {
      return send(res, 404, { error: 'Item not found' })
    }
    return send(res, 200, ITEM)
  }

  if (req.method === 'GET' && path === '/clients') {
    return send(res, 200, { clients: [CLIENT] })
  }

  if (req.method === 'POST' && path === '/play') {
    const body = await readJson(req).catch(() => ({}))
    console.log('[ref-ext] play request:', body)
    if (body?.itemId !== ITEM.id) {
      return send(res, 200, { ok: false, code: 'UNKNOWN', message: 'Unknown item' })
    }
    return send(res, 200, { ok: true })
  }

  send(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[ref-ext] listening on http://localhost:${PORT}`)
  console.log(`[ref-ext] register this URL in Jellybox at /dashboard/settings/extensions`)
  console.log(`[ref-ext] connect with field "${EXPECTED_FIELD}" set to any non-empty value`)
})
