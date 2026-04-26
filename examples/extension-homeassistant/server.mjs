// Home Assistant Scripts extension for Jellybox.
//
// Tag a Jellybox tag with a Home Assistant script. Scanning the tag triggers
// the script. The script itself decides what to play / which device / what
// volume — Jellybox just calls script.turn_on.
//
// Run:
//   HOMEASSISTANT_URL=http://homeassistant.local:8123 \
//   JELLYBOX_BEARER_SECRET=jbe_... \
//   node server.mjs

import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PORT = Number(process.env.PORT ?? 4557)
// In production, set this to the bearer secret Jellybox issued at registration.
// Unset = accept any non-empty bearer (dev only).
const EXPECTED_BEARER = process.env.JELLYBOX_BEARER_SECRET ?? null
const HA_URL = (process.env.HOMEASSISTANT_URL ?? '').replace(/\/$/, '')

if (!HA_URL) {
  console.error('[ha-ext] HOMEASSISTANT_URL is required (e.g. http://homeassistant.local:8123)')
  process.exit(1)
}

// accountId → { token, displayName }. Persisted to a JSON file alongside
// server.mjs (override with ACCOUNTS_FILE) so connections survive restarts.
// The file holds long-lived HA tokens — gitignored, treat like any secret.
const ACCOUNTS_FILE = resolve(process.env.ACCOUNTS_FILE ?? `${__dirname}/accounts.json`)
const accounts = new Map()

async function loadAccounts() {
  try {
    const raw = await readFile(ACCOUNTS_FILE, 'utf8')
    const obj = JSON.parse(raw)
    for (const [k, v] of Object.entries(obj)) accounts.set(k, v)
    console.log(`[ha-ext] loaded ${accounts.size} account(s) from ${ACCOUNTS_FILE}`)
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[ha-ext] could not load ${ACCOUNTS_FILE}: ${err.message}`)
    }
  }
}

let saveQueue = Promise.resolve()
function saveAccounts() {
  // Serialise writes so two concurrent /authenticate/complete calls can't race.
  saveQueue = saveQueue.then(async () => {
    const obj = Object.fromEntries(accounts)
    await mkdir(dirname(ACCOUNTS_FILE), { recursive: true })
    await writeFile(ACCOUNTS_FILE, JSON.stringify(obj, null, 2), { mode: 0o600 })
  }).catch((err) => {
    console.error(`[ha-ext] failed to save ${ACCOUNTS_FILE}: ${err.message}`)
  })
  return saveQueue
}

const MANIFEST = {
  name: 'Home Assistant Scripts',
  version: '0.1.0',
  iconUrl: 'https://brands.home-assistant.io/_/homeassistant/icon.png',
  authFlow: 'credentials',
  authFields: [
    {
      key: 'token',
      label: 'Long-lived access token',
      secret: true,
      required: true,
    },
  ],
  // listClients: false → Jellybox skips the default-client picker. A script
  // already encapsulates which device(s) it talks to.
  capabilities: { search: true, listClients: false, images: false },
  itemTypes: ['script'],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    req.on('data', (c) => { data += c })
    req.on('end', () => {
      if (!data) return resolve({})
      try { resolve(JSON.parse(data)) } catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

function requireBearer(req, res) {
  const auth = req.headers['authorization']
  if (!auth?.toLowerCase().startsWith('bearer ')) {
    send(res, 401, { error: 'Missing bearer token' })
    return false
  }
  const token = auth.slice(7).trim()
  if (EXPECTED_BEARER && token !== EXPECTED_BEARER) {
    send(res, 401, { error: 'Invalid bearer token' })
    return false
  }
  return true
}

async function sha256Hex(input) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Every script gets the Home Assistant brand icon as its tag artwork — the
// HA scripts API doesn't expose a per-entity image, so a shared brand mark
// reads better than no image at all.
const DEFAULT_ITEM_IMAGE = 'https://brands.home-assistant.io/_/homeassistant/icon.png'

// ─── Home Assistant REST API ─────────────────────────────────────────────────

async function haFetch(path, token, init = {}) {
  const res = await fetch(`${HA_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(8_000),
  })
  return res
}

async function haListScripts(token) {
  const res = await haFetch('/api/states', token)
  if (!res.ok) {
    throw new Error(`Home Assistant returned ${res.status} listing entities`)
  }
  const states = await res.json()
  return states
    .filter((s) => typeof s.entity_id === 'string' && s.entity_id.startsWith('script.'))
    .map((s) => ({
      id: s.entity_id,
      title: s.attributes?.friendly_name ?? s.entity_id.replace(/^script\./, '').replace(/_/g, ' '),
      subtitle: s.entity_id,
      imageUrl: DEFAULT_ITEM_IMAGE,
      type: 'script',
    }))
}

async function haGetScript(token, entityId) {
  const res = await haFetch(`/api/states/${encodeURIComponent(entityId)}`, token)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Home Assistant returned ${res.status} fetching ${entityId}`)
  const s = await res.json()
  return {
    id: s.entity_id,
    title: s.attributes?.friendly_name ?? s.entity_id.replace(/^script\./, '').replace(/_/g, ' '),
    subtitle: s.entity_id,
    imageUrl: DEFAULT_ITEM_IMAGE,
    type: 'script',
  }
}

async function haTriggerScript(token, entityId) {
  const res = await haFetch('/api/services/script/turn_on', token, {
    method: 'POST',
    body: JSON.stringify({ entity_id: entityId }),
  })
  return res
}

// ─── HTTP routes ─────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const path = url.pathname
  console.log(`[ha-ext] ${req.method} ${path}`)

  // Public.
  if (req.method === 'GET' && path === '/manifest') {
    return send(res, 200, MANIFEST)
  }

  if (!requireBearer(req, res)) return

  // Validate the token against Home Assistant, mint a stable accountId.
  if (req.method === 'POST' && path === '/authenticate/complete') {
    let body
    try { body = await readJson(req) } catch { return send(res, 400, { error: 'Bad JSON' }) }
    const token = body?.fields?.token?.trim()
    if (!token) return send(res, 422, { error: 'Missing token field' })

    const check = await haFetch('/api/', token).catch((e) => ({ ok: false, _err: e }))
    if (!check.ok) {
      const msg = check._err
        ? `Could not reach Home Assistant: ${check._err.message}`
        : check.status === 401
          ? 'Token rejected by Home Assistant.'
          : `Home Assistant returned ${check.status}.`
      return send(res, 422, { error: msg })
    }

    // Same token reconnecting → same accountId. Keeps ExtensionAccount stable.
    const accountId = (await sha256Hex(token)).slice(0, 24)
    const displayName = `Home Assistant (${new URL(HA_URL).host})`
    accounts.set(accountId, { token, displayName })
    await saveAccounts()
    return send(res, 200, { accountId, displayName })
  }

  if (req.method === 'POST' && path === '/search') {
    const body = await readJson(req).catch(() => ({}))
    const acc = accounts.get(body?.accountId)
    if (!acc) return send(res, 401, { error: 'Unknown account — reconnect from Jellybox' })

    try {
      const all = await haListScripts(acc.token)
      const q = (body?.query ?? '').trim().toLowerCase()
      const filtered = q
        ? all.filter((s) => s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
        : all
      // Cap to a reasonable page size.
      return send(res, 200, { items: filtered.slice(0, 50) })
    } catch (e) {
      return send(res, 502, { error: e.message })
    }
  }

  if (req.method === 'GET' && path === '/item') {
    const accountId = url.searchParams.get('accountId')
    const itemId = url.searchParams.get('itemId')
    const acc = accounts.get(accountId)
    if (!acc) return send(res, 401, { error: 'Unknown account' })
    if (!itemId) return send(res, 400, { error: 'Missing itemId' })
    try {
      const item = await haGetScript(acc.token, itemId)
      if (!item) return send(res, 404, { error: 'Script not found' })
      return send(res, 200, item)
    } catch (e) {
      return send(res, 502, { error: e.message })
    }
  }

  if (req.method === 'POST' && path === '/play') {
    const body = await readJson(req).catch(() => ({}))
    const acc = accounts.get(body?.accountId)
    if (!acc) {
      return send(res, 200, { ok: false, code: 'AUTH_ERROR', message: 'Unknown account' })
    }
    const entityId = body?.itemId
    if (!entityId || !entityId.startsWith('script.')) {
      return send(res, 200, { ok: false, code: 'UNKNOWN', message: 'Missing or invalid script entity_id' })
    }

    try {
      const r = await haTriggerScript(acc.token, entityId)
      if (r.status === 401) {
        return send(res, 200, { ok: false, code: 'AUTH_ERROR', message: 'Token rejected by Home Assistant' })
      }
      if (!r.ok) {
        return send(res, 200, { ok: false, code: 'OFFLINE', message: `Home Assistant returned ${r.status}` })
      }
      return send(res, 200, { ok: true })
    } catch (e) {
      return send(res, 200, { ok: false, code: 'OFFLINE', message: `Could not reach Home Assistant: ${e.message}` })
    }
  }

  send(res, 404, { error: 'Not found' })
})

await loadAccounts()

server.listen(PORT, () => {
  console.log(`[ha-ext] listening on http://localhost:${PORT}`)
  console.log(`[ha-ext] Home Assistant: ${HA_URL}`)
  console.log(`[ha-ext] accounts file: ${ACCOUNTS_FILE}`)
  if (!EXPECTED_BEARER) {
    console.warn('[ha-ext] WARNING: JELLYBOX_BEARER_SECRET unset — accepting any bearer. Fine for dev, not for prod.')
  }
})
