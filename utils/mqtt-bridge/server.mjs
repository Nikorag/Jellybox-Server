#!/usr/bin/env node
/**
 * Jellybox MQTT Bridge
 *
 * Accepts authenticated HTTPS POSTs (typically tunneled from Cloudflare or
 * Tailscale) and forwards them to a local Mosquitto broker over a single
 * long-lived MQTT connection.
 *
 * Endpoints
 *   GET  /healthz                — liveness; returns 200 once connected to MQTT
 *   POST /publish                — single or batch publish (see below)
 *
 * /publish body shapes
 *   { "topic": "x/y", "payload": "...", "retain": true, "qos": 0 }
 *   [ { "topic": "...", "payload": "..." }, ... ]
 *
 * Auth: every request must carry `Authorization: Bearer <BRIDGE_TOKEN>`.
 *
 * Env vars
 *   BRIDGE_TOKEN     (required)  Shared secret matched against the Bearer header.
 *   MQTT_URL         (required)  e.g. mqtt://mosquitto.local:1883
 *   MQTT_USERNAME    (optional)
 *   MQTT_PASSWORD    (optional)
 *   PORT             (default 8080)
 *   HOST             (default 0.0.0.0)
 *   MAX_BODY_BYTES   (default 65536) Reject larger POST bodies.
 */
import { createServer } from 'node:http'
import { connect as mqttConnect } from 'mqtt'

const {
  BRIDGE_TOKEN,
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  PORT = '8080',
  HOST = '0.0.0.0',
  MAX_BODY_BYTES = '65536',
} = process.env

if (!BRIDGE_TOKEN) {
  console.error('[bridge] BRIDGE_TOKEN is required')
  process.exit(1)
}
if (!MQTT_URL) {
  console.error('[bridge] MQTT_URL is required')
  process.exit(1)
}

const maxBody = Number.parseInt(MAX_BODY_BYTES, 10)

// ── Long-lived MQTT client ───────────────────────────────────────────────────

const mqttClient = mqttConnect(MQTT_URL, {
  username: MQTT_USERNAME || undefined,
  password: MQTT_PASSWORD || undefined,
  reconnectPeriod: 2_000,
  clientId: `jellybox-bridge-${Math.random().toString(16).slice(2, 10)}`,
})

let mqttReady = false
mqttClient.on('connect', () => {
  mqttReady = true
  console.log(`[bridge] connected to ${MQTT_URL}`)
})
mqttClient.on('reconnect', () => console.log('[bridge] reconnecting…'))
mqttClient.on('close', () => {
  mqttReady = false
  console.log('[bridge] disconnected')
})
mqttClient.on('error', (err) => console.error('[bridge] mqtt error:', err.message))

// ── HTTP helpers ────────────────────────────────────────────────────────────

function send(res, status, body) {
  const payload =
    typeof body === 'string' ? body : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function authorised(req) {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Bearer ')) return false
  const token = header.slice('Bearer '.length).trim()
  // Constant-time compare
  const a = Buffer.from(token)
  const b = Buffer.from(BRIDGE_TOKEN)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBody) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function normaliseMessages(input) {
  const list = Array.isArray(input) ? input : [input]
  return list.map((m) => {
    if (typeof m !== 'object' || m === null) {
      throw new Error('each message must be an object')
    }
    if (typeof m.topic !== 'string' || m.topic.length === 0) {
      throw new Error('topic is required')
    }
    if (typeof m.payload !== 'string') {
      throw new Error('payload must be a string')
    }
    const qos = m.qos === 1 || m.qos === 2 ? m.qos : 0
    const retain = m.retain === true
    return { topic: m.topic, payload: m.payload, qos, retain }
  })
}

function publishOne({ topic, payload, qos, retain }) {
  return new Promise((resolve, reject) => {
    mqttClient.publish(topic, payload, { qos, retain }, (err) =>
      err ? reject(err) : resolve(),
    )
  })
}

// ── HTTP server ─────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    return send(res, mqttReady ? 200 : 503, {
      ok: mqttReady,
      mqtt: mqttReady ? 'connected' : 'disconnected',
    })
  }

  if (req.method !== 'POST' || req.url !== '/publish') {
    return send(res, 404, { error: 'not found' })
  }

  if (!authorised(req)) {
    return send(res, 401, { error: 'unauthorised' })
  }

  if (!mqttReady) {
    return send(res, 503, { error: 'mqtt not connected' })
  }

  let raw
  try {
    raw = await readBody(req)
  } catch (err) {
    return send(res, 413, { error: err.message })
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return send(res, 400, { error: 'invalid json' })
  }

  let messages
  try {
    messages = normaliseMessages(parsed)
  } catch (err) {
    return send(res, 400, { error: err.message })
  }

  try {
    await Promise.all(messages.map(publishOne))
  } catch (err) {
    console.error('[bridge] publish failed:', err.message)
    return send(res, 502, { error: 'publish failed', detail: err.message })
  }

  return send(res, 200, { ok: true, count: messages.length })
})

server.listen(Number.parseInt(PORT, 10), HOST, () => {
  console.log(`[bridge] listening on http://${HOST}:${PORT}`)
})

function shutdown() {
  console.log('[bridge] shutting down')
  server.close()
  mqttClient.end(false, {}, () => process.exit(0))
  setTimeout(() => process.exit(1), 5_000).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
