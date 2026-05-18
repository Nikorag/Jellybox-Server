import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deviceLogsEnabled, isExtensionsAdmin } from '@/lib/auth-flags'
import { subscribe, type LogLine } from '@/lib/device-logs/bus'

export const dynamic = 'force-dynamic'

const HEARTBEAT_MS = 15_000

export async function GET() {
  if (!deviceLogsEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!isExtensionsAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const close = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          close()
        }
      }

      send('hello', { ts: Date.now() })

      const unsubscribe = subscribe((line: LogLine) => send('log', line))

      // Heartbeat keeps proxies (and Fluid Compute's idle detector) from
      // closing the connection during quiet periods.
      const heartbeat = setInterval(() => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        } catch {
          close()
        }
      }, HEARTBEAT_MS)
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      'x-accel-buffering': 'no',
    },
  })
}
