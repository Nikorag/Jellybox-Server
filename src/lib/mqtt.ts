/**
 * Optional Home Assistant MQTT integration.
 *
 * Two transports:
 *
 *   • Direct MQTT — set MQTT_URL to an mqtt://, mqtts://, ws://, or wss://
 *     broker. Each publish opens a short-lived MQTT connection. Suitable
 *     when the server can reach the broker (Docker compose, Tailscale, etc).
 *
 *   • Pull-bridge — set MQTT_BRIDGE_TOKEN and leave MQTT_URL unset. Each
 *     publish goes to an in-process bus (src/lib/mqtt-bus.ts) that the SSE
 *     stream at /api/mqtt/stream drains. The mqtt-bridge util on your LAN
 *     connects outbound to that stream and republishes to Mosquitto, so
 *     nothing on the home network needs to be exposed to the internet.
 *
 * All publish functions are best-effort: they catch their own errors and
 * log, never throwing back to callers.
 */
import mqtt, { type IClientOptions, type MqttClient } from 'mqtt'
import { publish as busPublish, type BusMessage } from '@/lib/mqtt-bus'

const CONNECT_TIMEOUT_MS = 4_000
const PUBLISH_TIMEOUT_MS = 4_000

type Transport = 'mqtt' | 'pull'

function getConfig() {
  const url = process.env.MQTT_URL
  const bridgeToken = process.env.MQTT_BRIDGE_TOKEN

  let transport: Transport | null = null
  if (url && /^(mqtt|mqtts|ws|wss):\/\//i.test(url)) {
    transport = 'mqtt'
  } else if (!url && bridgeToken) {
    transport = 'pull'
  } else if (url) {
    console.warn(
      `[mqtt] MQTT_URL has unsupported scheme; expected mqtt://, mqtts://, ws://, or wss:// — got "${url}"`,
    )
  }
  if (!transport) return null

  return {
    url,
    transport,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    bridgeToken: bridgeToken || undefined,
    discoveryPrefix: process.env.MQTT_DISCOVERY_PREFIX || 'homeassistant',
    baseTopic: process.env.MQTT_BASE_TOPIC || 'jellybox',
  }
}

export function isMqttEnabled(): boolean {
  return getConfig() !== null
}

type PublishMsg = { topic: string; payload: string; retain?: boolean }

async function withClient<T>(
  cfg: NonNullable<ReturnType<typeof getConfig>>,
  fn: (client: MqttClient) => Promise<T>,
): Promise<T | null> {
  if (!cfg.url) return null
  const opts: IClientOptions = {
    connectTimeout: CONNECT_TIMEOUT_MS,
    reconnectPeriod: 0,
    username: cfg.username,
    password: cfg.password,
  }

  let client: MqttClient | null = null
  try {
    client = await new Promise<MqttClient>((resolve, reject) => {
      const c = mqtt.connect(cfg.url!, opts)
      const timer = setTimeout(() => {
        c.end(true)
        reject(new Error('MQTT connect timeout'))
      }, CONNECT_TIMEOUT_MS)
      c.once('connect', () => {
        clearTimeout(timer)
        resolve(c)
      })
      c.once('error', (err) => {
        clearTimeout(timer)
        c.end(true)
        reject(err)
      })
    })
    return await fn(client)
  } catch (err) {
    console.error('[mqtt] connection failed:', err instanceof Error ? err.message : err)
    return null
  } finally {
    if (client) {
      try {
        await new Promise<void>((resolve) => client!.end(false, {}, () => resolve()))
      } catch {
        /* ignore */
      }
    }
  }
}

async function publishAll(messages: PublishMsg[]): Promise<void> {
  if (messages.length === 0) return
  const cfg = getConfig()
  if (!cfg) return

  if (cfg.transport === 'pull') {
    const busMessages: BusMessage[] = messages.map((m) => ({
      topic: m.topic,
      payload: m.payload,
      retain: m.retain ?? false,
    }))
    busPublish(busMessages)
    return
  }

  await withClient(cfg, async (client) => {
    await Promise.all(
      messages.map(
        (m) =>
          new Promise<void>((resolve) => {
            const timer = setTimeout(() => resolve(), PUBLISH_TIMEOUT_MS)
            client.publish(
              m.topic,
              m.payload,
              { qos: 0, retain: m.retain ?? false },
              () => {
                clearTimeout(timer)
                resolve()
              },
            )
          }),
      ),
    )
  })
}

// ── Topic helpers ───────────────────────────────────────────────────────────

function topics(deviceId: string) {
  const cfg = getConfig()!
  const base = `${cfg.baseTopic}/device/${deviceId}`
  const disc = (component: string, objectId: string) =>
    `${cfg.discoveryPrefix}/${component}/jellybox_${deviceId}/${objectId}/config`
  return {
    state: {
      lastTag: `${base}/last_tag`,
      lastTagAttrs: `${base}/last_tag/attrs`,
      lastSeen: `${base}/last_seen`,
      lastTagAt: `${base}/last_tag_at`,
    },
    event: `${base}/event/tag_scanned`,
    availability: `${base}/availability`,
    discovery: {
      lastTag: disc('sensor', 'last_tag'),
      lastSeen: disc('sensor', 'last_seen'),
      lastTagAt: disc('sensor', 'last_tag_at'),
      event: disc('event', 'tag_scanned'),
    },
  }
}

function deviceBlock(device: { id: string; name: string }) {
  return {
    identifiers: [`jellybox_${device.id}`],
    name: device.name,
    manufacturer: 'Jellybox',
    model: 'Jellybox',
    via_device: 'jellybox_server',
  }
}

function discoveryPayloads(device: { id: string; name: string }) {
  const t = topics(device.id)
  const dev = deviceBlock(device)
  const availability = [{ topic: t.availability }]
  const uid = `jellybox_${device.id}`

  return {
    lastTag: JSON.stringify({
      name: 'Last scanned tag',
      unique_id: `${uid}_last_tag`,
      state_topic: t.state.lastTag,
      json_attributes_topic: t.state.lastTagAttrs,
      icon: 'mdi:nfc-variant',
      availability,
      device: dev,
    }),
    lastSeen: JSON.stringify({
      name: 'Last seen',
      unique_id: `${uid}_last_seen`,
      state_topic: t.state.lastSeen,
      device_class: 'timestamp',
      availability,
      device: dev,
    }),
    lastTagAt: JSON.stringify({
      name: 'Last tag scanned at',
      unique_id: `${uid}_last_tag_at`,
      state_topic: t.state.lastTagAt,
      device_class: 'timestamp',
      availability,
      device: dev,
    }),
    event: JSON.stringify({
      name: 'Tag scanned',
      unique_id: `${uid}_tag_scanned_event`,
      state_topic: t.event,
      event_types: ['tag_scanned'],
      availability,
      device: dev,
    }),
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function publishDeviceDiscovery(device: {
  id: string
  name: string
}): Promise<void> {
  if (!isMqttEnabled()) return
  const t = topics(device.id)
  const p = discoveryPayloads(device)
  await publishAll([
    { topic: t.discovery.lastTag, payload: p.lastTag, retain: true },
    { topic: t.discovery.lastSeen, payload: p.lastSeen, retain: true },
    { topic: t.discovery.lastTagAt, payload: p.lastTagAt, retain: true },
    { topic: t.discovery.event, payload: p.event, retain: true },
    { topic: t.availability, payload: 'online', retain: true },
  ])
}

export async function publishDeviceRemoval(deviceId: string): Promise<void> {
  if (!isMqttEnabled()) return
  const t = topics(deviceId)
  await publishAll([
    { topic: t.discovery.lastTag, payload: '', retain: true },
    { topic: t.discovery.lastSeen, payload: '', retain: true },
    { topic: t.discovery.lastTagAt, payload: '', retain: true },
    { topic: t.discovery.event, payload: '', retain: true },
    { topic: t.availability, payload: '', retain: true },
    { topic: t.state.lastTag, payload: '', retain: true },
    { topic: t.state.lastTagAttrs, payload: '', retain: true },
    { topic: t.state.lastSeen, payload: '', retain: true },
    { topic: t.state.lastTagAt, payload: '', retain: true },
  ])
}

export async function publishDeviceCheckIn(device: {
  id: string
  name: string
}): Promise<void> {
  if (!isMqttEnabled()) return
  const t = topics(device.id)
  const p = discoveryPayloads(device)
  const now = new Date().toISOString()

  await publishAll([
    { topic: t.discovery.lastTag, payload: p.lastTag, retain: true },
    { topic: t.discovery.lastSeen, payload: p.lastSeen, retain: true },
    { topic: t.discovery.lastTagAt, payload: p.lastTagAt, retain: true },
    { topic: t.discovery.event, payload: p.event, retain: true },
    { topic: t.availability, payload: 'online', retain: true },
    { topic: t.state.lastSeen, payload: now, retain: true },
  ])
}

export async function publishTagScan(
  device: { id: string },
  tagLabel: string,
  tagId: string,
): Promise<void> {
  if (!isMqttEnabled()) return
  const t = topics(device.id)
  const now = new Date().toISOString()

  const attrs = JSON.stringify({ tag_id: tagId })
  const event = JSON.stringify({
    event_type: 'tag_scanned',
    tag_label: tagLabel,
    tag_id: tagId,
    timestamp: now,
  })

  await publishAll([
    { topic: t.state.lastTag, payload: tagLabel, retain: true },
    { topic: t.state.lastTagAttrs, payload: attrs, retain: true },
    { topic: t.state.lastTagAt, payload: now, retain: true },
    { topic: t.state.lastSeen, payload: now, retain: true },
    { topic: t.event, payload: event, retain: false },
  ])
}
