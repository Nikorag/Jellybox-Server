#!/usr/bin/env node
/**
 * Jellybox MQTT Bridge — pull mode
 *
 * Connects OUTBOUND to a Jellybox server's /api/mqtt/stream SSE endpoint and
 * republishes each received message to a local Mosquitto broker. Because the
 * connection is outbound, nothing on the home network needs to be exposed to
 * the internet — runs happily behind NAT, a residential router, or any
 * firewall that allows outbound HTTPS.
 *
 * Env vars
 *   JELLYBOX_URL     (required)  Base URL of the Jellybox server,
 *                                e.g. https://jellybox.example.com
 *   BRIDGE_TOKEN     (required)  Must match MQTT_BRIDGE_TOKEN on the server.
 *   MQTT_URL         (required)  Local broker URL, e.g. mqtt://mosquitto:1883
 *   MQTT_USERNAME    (optional)
 *   MQTT_PASSWORD    (optional)
 *
 *   RECONNECT_MIN_MS (default 1000)   Initial reconnect delay (exponential backoff)
 *   RECONNECT_MAX_MS (default 30000)  Max reconnect delay
 */
import { connect as mqttConnect } from 'mqtt'

const {
  JELLYBOX_URL,
  BRIDGE_TOKEN,
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  RECONNECT_MIN_MS = '1000',
  RECONNECT_MAX_MS = '30000',
} = process.env

for (const [name, value] of Object.entries({ JELLYBOX_URL, BRIDGE_TOKEN, MQTT_URL })) {
  if (!value) {
    console.error(`[bridge] ${name} is required`)
    process.exit(1)
  }
}

const reconnectMin = Number.parseInt(RECONNECT_MIN_MS, 10)
const reconnectMax = Number.parseInt(RECONNECT_MAX_MS, 10)

// ── Long-lived MQTT client ───────────────────────────────────────────────────

const mqttClient = mqttConnect(MQTT_URL, {
  username: MQTT_USERNAME || undefined,
  password: MQTT_PASSWORD || undefined,
  reconnectPeriod: 2_000,
  clientId: `jellybox-bridge-${Math.random().toString(16).slice(2, 10)}`,
})

mqttClient.on('connect', () => console.log(`[bridge] mqtt connected to ${MQTT_URL}`))
mqttClient.on('reconnect', () => console.log('[bridge] mqtt reconnecting…'))
mqttClient.on('close', () => console.log('[bridge] mqtt disconnected'))
mqttClient.on('error', (err) => console.error('[bridge] mqtt error:', err.message))

// ── SSE consumer ─────────────────────────────────────────────────────────────

const streamUrl = new URL('/api/mqtt/stream', JELLYBOX_URL).toString()
let backoff = reconnectMin
let abort

function handleEvent(eventName, dataJson) {
  if (eventName === 'publish') {
    let msg
    try {
      msg = JSON.parse(dataJson)
    } catch {
      console.warn('[bridge] malformed publish event')
      return
    }
    if (typeof msg?.topic !== 'string' || typeof msg?.payload !== 'string') return
    mqttClient.publish(
      msg.topic,
      msg.payload,
      { qos: 0, retain: msg.retain === true },
      (err) => {
        if (err) console.error('[bridge] publish failed:', err.message)
      },
    )
  } else if (eventName === 'hello') {
    console.log('[bridge] stream connected')
  } else if (eventName === 'bye') {
    console.log('[bridge] server signaled soft-close — will reconnect')
  }
}

/**
 * Read an SSE response body line-by-line and dispatch complete events.
 * Format: blocks separated by blank lines, with `event:` and `data:` lines.
 */
async function consumeStream(res) {
  const decoder = new TextDecoder()
  let buffer = ''
  let eventName = 'message'
  let dataLines = []

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true })

    let nlIdx
    while ((nlIdx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nlIdx).replace(/\r$/, '')
      buffer = buffer.slice(nlIdx + 1)

      if (line === '') {
        if (dataLines.length > 0) {
          handleEvent(eventName, dataLines.join('\n'))
        }
        eventName = 'message'
        dataLines = []
      } else if (line.startsWith(':')) {
        // Comment / heartbeat — ignore.
      } else if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''))
      }
    }
  }
}

async function connectOnce() {
  abort = new AbortController()
  const res = await fetch(streamUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
      Accept: 'text/event-stream',
    },
    signal: abort.signal,
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`stream returned ${res.status}: ${body.slice(0, 200)}`)
  }
  if (!res.body) throw new Error('stream has no body')

  // Reset backoff once we've successfully connected.
  backoff = reconnectMin

  await consumeStream(res)
}

async function runForever() {
  console.log(`[bridge] connecting to ${streamUrl}`)
  // Eslint complains about while(true); the explicit comment is intentional.
  for (;;) {
    try {
      await connectOnce()
      console.log('[bridge] stream ended cleanly, reconnecting')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (err?.name === 'AbortError') return
      console.error(`[bridge] stream error: ${msg}; retry in ${backoff}ms`)
    }
    await new Promise((r) => setTimeout(r, backoff))
    backoff = Math.min(backoff * 2, reconnectMax)
  }
}

function shutdown() {
  console.log('[bridge] shutting down')
  if (abort) abort.abort()
  mqttClient.end(false, {}, () => process.exit(0))
  setTimeout(() => process.exit(1), 5_000).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

runForever().catch((err) => {
  console.error('[bridge] fatal:', err)
  process.exit(1)
})
