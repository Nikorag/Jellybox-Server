/**
 * In-process pub/sub for outbound MQTT messages in "pull" mode.
 *
 * When the bridge connects outbound (instead of being POSTed to), the SSE
 * route at /api/mqtt/stream subscribes to this bus and forwards each
 * published message to its connected bridge. Code paths that mutate state
 * (play, device check-in, etc.) call `publish` on the bus instead of
 * opening an MQTT or HTTP connection.
 *
 * Module-level state is fine on Fluid Compute where a single warm instance
 * handles most traffic. If Vercel ever spins up a second instance under
 * load, a message published on instance B won't reach a bridge whose SSE
 * connection landed on instance A. For a Jellybox-scale workload (a few
 * publishes per minute) this almost never happens in practice; for higher
 * throughput we'd move to Postgres LISTEN/NOTIFY.
 */

export interface BusMessage {
  topic: string
  payload: string
  retain: boolean
}

type Handler = (msg: BusMessage) => void

interface Bus {
  handlers: Set<Handler>
}

const globalKey = '__jellybox_mqtt_bus__'
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

export function publish(messages: BusMessage[]): void {
  const bus = getBus()
  if (bus.handlers.size === 0) return
  for (const m of messages) {
    for (const h of bus.handlers) {
      try {
        h(m)
      } catch {
        // Ignore handler errors so one slow subscriber can't break others.
      }
    }
  }
}

export function subscriberCount(): number {
  return getBus().handlers.size
}
