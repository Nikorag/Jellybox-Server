// Jellybox device log bridge.
//
// Listens for UDP broadcast packets from the firmware's UDPLogger (default
// port 5514) and forwards each line to a Jellybox Server's ingest endpoint
// over HTTPS with a bearer token. The server fans the lines out over SSE
// to the admin Device-Logs page.
//
// Designed to live next to your Jellybox device on the LAN — either as a
// long-running process on your dev machine or as a docker-compose service
// using host networking (so it can actually receive broadcasts).
//
// Required env:
//   JELLYBOX_URL          e.g. https://jellybox.example.com
//   INGEST_TOKEN          must equal the server's DEVICE_LOGS_INGEST_TOKEN
//
// Optional env:
//   UDP_PORT     default 5514
//   UDP_BIND     default 0.0.0.0
//   FLUSH_MS     default 250  (batch window before POSTing)
//   MAX_BATCH    default 100  (force flush once this many lines queued)
//   FILTER_IP    only forward packets from this source IP

const dgram = require('dgram')

const JELLYBOX_URL = (process.env.JELLYBOX_URL || '').replace(/\/$/, '')
const INGEST_TOKEN = process.env.INGEST_TOKEN || ''
const UDP_PORT = Number(process.env.UDP_PORT || 5514)
const UDP_BIND = process.env.UDP_BIND || '0.0.0.0'
const FLUSH_MS = Number(process.env.FLUSH_MS || 250)
const MAX_BATCH = Number(process.env.MAX_BATCH || 100)
const FILTER_IP = process.env.FILTER_IP || null

if (!JELLYBOX_URL) {
  console.error('[log-bridge] JELLYBOX_URL is required (e.g. https://jellybox.example.com)')
  process.exit(1)
}
if (!INGEST_TOKEN) {
  console.error('[log-bridge] INGEST_TOKEN is required (must match server DEVICE_LOGS_INGEST_TOKEN)')
  process.exit(1)
}

const INGEST_URL = `${JELLYBOX_URL}/api/device-logs/ingest`

const queue = []
let flushTimer = null
let inflight = false
let lastErrorAt = 0
let droppedSinceLog = 0

function schedule() {
  if (flushTimer) return
  flushTimer = setTimeout(flush, FLUSH_MS)
}

async function flush() {
  flushTimer = null
  if (inflight || queue.length === 0) return
  const batch = queue.splice(0, queue.length)
  inflight = true
  try {
    const res = await fetch(INGEST_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${INGEST_TOKEN}`,
      },
      body: JSON.stringify({ lines: batch }),
    })
    if (!res.ok) {
      // Don't requeue — we'd just spiral on persistent errors. Just count and warn.
      droppedSinceLog += batch.length
      const now = Date.now()
      if (now - lastErrorAt > 5000) {
        lastErrorAt = now
        console.error(`[log-bridge] ingest ${res.status} ${res.statusText} — dropped ${droppedSinceLog} line(s) recently`)
        droppedSinceLog = 0
      }
    }
  } catch (err) {
    droppedSinceLog += batch.length
    const now = Date.now()
    if (now - lastErrorAt > 5000) {
      lastErrorAt = now
      console.error(`[log-bridge] ingest failed: ${err.message} — dropped ${droppedSinceLog} line(s) recently`)
      droppedSinceLog = 0
    }
  } finally {
    inflight = false
    if (queue.length) schedule()
  }
}

const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true })

sock.on('error', (err) => {
  console.error(`[log-bridge] socket error: ${err.message}`)
  sock.close()
  process.exit(1)
})

sock.on('message', (msg, rinfo) => {
  if (FILTER_IP && rinfo.address !== FILTER_IP) return
  const text = msg.toString('utf8').replace(/\r?\n$/, '')
  // Firmware format: "<millis> <body>"
  const m = text.match(/^(\d+)\s(.*)$/s)
  const millis = m ? Number(m[1]) : null
  const body = m ? m[2] : text
  if (!body) return
  queue.push({ deviceIp: rinfo.address, millis, body })
  if (queue.length >= MAX_BATCH) {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    flush()
  } else {
    schedule()
  }
})

sock.on('listening', () => {
  const addr = sock.address()
  console.log(`[log-bridge] listening on ${addr.address}:${addr.port}`)
  console.log(`[log-bridge] forwarding to ${INGEST_URL}`)
  if (FILTER_IP) console.log(`[log-bridge] filter: only ${FILTER_IP}`)
})

sock.bind(UDP_PORT, UDP_BIND)

const shutdown = () => {
  console.log('[log-bridge] shutting down')
  sock.close()
  // Best-effort final flush
  flush().finally(() => process.exit(0))
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
