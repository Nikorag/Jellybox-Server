// In-memory pub/sub for live device log lines. No storage — lines that arrive
// while no one is subscribed are dropped on the floor. Subscribers receive
// every line published after they connect.
//
// Module-level state is fine for single-instance deploys (Docker compose) and
// works well enough on Vercel Fluid Compute where instances are reused across
// requests. It is NOT correct for multi-instance horizontal scaling — a line
// ingested on instance A won't reach a subscriber on instance B. The feature
// is dev/debug-only and gated by DEVICE_LOGS_ENABLED, so that's acceptable.

export interface LogLine {
  deviceIp: string
  millis: number | null
  body: string
  receivedAt: number
}

type Handler = (line: LogLine) => void

interface Bus {
  handlers: Set<Handler>
}

const globalKey = '__jellybox_device_log_bus__'
const globalAny = globalThis as unknown as Record<string, Bus | undefined>

function getBus(): Bus {
  let bus = globalAny[globalKey]
  if (!bus) {
    bus = { handlers: new Set() }
    globalAny[globalKey] = bus
  }
  return bus
}

export function subscribe(handler: Handler): () => void {
  const bus = getBus()
  bus.handlers.add(handler)
  return () => {
    bus.handlers.delete(handler)
  }
}

export function publish(line: LogLine): void {
  const bus = getBus()
  for (const h of bus.handlers) {
    try {
      h(line)
    } catch {
      // Ignore handler errors so one slow subscriber can't break others.
    }
  }
}

export function subscriberCount(): number {
  return getBus().handlers.size
}
