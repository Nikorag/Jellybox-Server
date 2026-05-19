# Jellybox MQTT Bridge

Outbound-only MQTT relay. Runs on the same LAN as your Mosquitto broker
and Home Assistant. Connects to the Jellybox server (typically Vercel)
over an authenticated HTTPS Server-Sent Events stream, receives outbound
MQTT messages, and republishes them to your local broker.

```
Home Assistant ◀── Mosquitto ◀── mqtt-bridge ──HTTPS (outbound only)──▶ Jellybox server (Vercel)
```

No inbound ports. No public hostname. Nothing on your home network is
exposed to the internet. The bridge just needs outbound HTTPS access,
which any consumer router allows by default.

## Run with Node

```bash
cd utils/mqtt-bridge
npm install
JELLYBOX_URL="https://jellybox.example.com" \
BRIDGE_TOKEN="$(openssl rand -hex 32)" \
MQTT_URL="mqtt://mosquitto.local:1883" \
MQTT_USERNAME="jellybox" \
MQTT_PASSWORD="..." \
npm start
```

Use the same `BRIDGE_TOKEN` value as `MQTT_BRIDGE_TOKEN` on the Jellybox
server.

## Run with Docker

```bash
docker build -t jellybox-mqtt-bridge utils/mqtt-bridge
docker run --rm --restart unless-stopped \
  -e JELLYBOX_URL="https://jellybox.example.com" \
  -e BRIDGE_TOKEN="..." \
  -e MQTT_URL="mqtt://mosquitto.local:1883" \
  -e MQTT_USERNAME="jellybox" \
  -e MQTT_PASSWORD="..." \
  jellybox-mqtt-bridge
```

Or via `docker compose`:

```yaml
services:
  mqtt-bridge:
    build: ./utils/mqtt-bridge
    restart: unless-stopped
    environment:
      JELLYBOX_URL: https://jellybox.example.com
      BRIDGE_TOKEN: ${BRIDGE_TOKEN}
      MQTT_URL: mqtt://mosquitto:1883
      MQTT_USERNAME: jellybox
      MQTT_PASSWORD: ${MQTT_PASSWORD}
```

## Configuration

| Env var            | Required | Default     | Notes                                       |
| ------------------ | -------- | ----------- | ------------------------------------------- |
| `JELLYBOX_URL`     | yes      | —           | Base URL of the Jellybox server (Vercel deployment) |
| `BRIDGE_TOKEN`     | yes      | —           | Shared secret; must equal `MQTT_BRIDGE_TOKEN` on the server |
| `MQTT_URL`         | yes      | —           | Internal broker, e.g. `mqtt://mosquitto:1883` |
| `MQTT_USERNAME`    | no       | —           | Mosquitto credentials                       |
| `MQTT_PASSWORD`    | no       | —           |                                             |
| `RECONNECT_MIN_MS` | no       | `1000`      | Initial backoff after a stream error        |
| `RECONNECT_MAX_MS` | no       | `30000`     | Backoff cap                                 |

## How it works

1. The bridge opens an HTTPS connection to
   `${JELLYBOX_URL}/api/mqtt/stream` with `Authorization: Bearer <BRIDGE_TOKEN>`.
2. The server holds the connection open as a Server-Sent Events stream
   and sends one `event: publish` per outbound MQTT message.
3. The bridge republishes each message to local Mosquitto over a single
   long-lived MQTT connection.
4. Vercel Functions have a 300 s execution cap. The server emits a soft
   `bye` a few seconds before that and the bridge reconnects.
   Exponential backoff (1 s → 30 s) handles broker / network blips.

## Configuring the Jellybox server

On Vercel (or wherever the server runs), set:

```
MQTT_BRIDGE_TOKEN=<same value as BRIDGE_TOKEN>
```

Leave `MQTT_URL` unset on the server — its presence would switch the
server into direct-MQTT mode. When `MQTT_BRIDGE_TOKEN` is set on its
own, every MQTT publish gets queued on an internal bus that the SSE
stream drains for the connected bridge.

## Health / debugging

- `GET ${JELLYBOX_URL}/api/mqtt/stream` returns `401` without auth and
  `404` when bridge mode is disabled — useful for verifying the server
  side of the config from outside.
- The bridge logs `[bridge] stream connected` once the SSE handshake
  completes, `[bridge] mqtt connected to …` once Mosquitto accepts it,
  and a line per publish failure.
- Reconnect on every Vercel 300 s soft-close is expected and prints a
  `server signaled soft-close — will reconnect` line — not an error.
