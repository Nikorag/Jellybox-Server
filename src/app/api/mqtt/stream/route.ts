/**
 * GET /api/mqtt/stream
 *
 * Server-Sent Events feed for the mqtt-bridge running on the user's LAN.
 * The bridge connects outbound (with `Authorization: Bearer <MQTT_BRIDGE_TOKEN>`)
 * and receives one `publish` event per outbound MQTT message. The route is
 * only mounted when MQTT_BRIDGE_TOKEN is set and MQTT_URL is unset — i.e.
 * pull-bridge mode. In direct-MQTT mode it 404s.
 *
 * Vercel Functions have a 300s wall-clock cap, so the route closes itself
 * gracefully a few seconds before that and the bridge reconnects.
 */
import { NextResponse } from 'next/server'
import { subscribe, type BusMessage } from '@/lib/mqtt-bus'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const HEARTBEAT_MS = 15_000
const SOFT_CLOSE_MS = 290_000

function bridgeEnabled(): boolean {
  return !!process.env.MQTT_BRIDGE_TOKEN && !process.env.MQTT_URL
}

function authorised(req: Request): boolean {
  const expected = process.env.MQTT_BRIDGE_TOKEN
  if (!expected) return false
  const header = req.headers.get('authorization')
  if (!header || !header.toLowerCase().startsWith('bearer ')) return false
  const token = header.slice(7).trim()
  if (token.length !== expected.length) return false
  // Constant-time compare
  let diff = 0
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

export async function GET(req: Request) {
  if (!bridgeEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!authorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const close = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        clearTimeout(softClose)
        unsubscribe()
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }

      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          )
        } catch {
          close()
        }
      }

      send('hello', { ts: Date.now() })

      const unsubscribe = subscribe((msg: BusMessage) => send('publish', msg))

      const heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        } catch {
          close()
        }
      }, HEARTBEAT_MS)

      // Close just before Vercel's 300s execution cap. The bridge auto-reconnects.
      const softClose = setTimeout(() => {
        send('bye', { reason: 'soft-close' })
        close()
      }, SOFT_CLOSE_MS)

      req.signal.addEventListener('abort', close)
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}
