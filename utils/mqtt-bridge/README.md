# Jellybox MQTT Bridge

Tiny HTTP→MQTT forwarder. Run it on the same network as your Mosquitto
broker and Home Assistant. Expose its HTTP port to the internet via
Cloudflare Tunnel, Tailscale Funnel, or any reverse proxy. The Jellybox
server (Vercel) then POSTs MQTT messages to it, which the bridge
republishes to your local broker.

```
Vercel (Jellybox server) ──HTTPS──▶  mqtt-bridge  ──TCP──▶ Mosquitto ──▶ Home Assistant
```

Why a bridge: opening Mosquitto's TCP port to the public internet is
inadvisable, and Cloudflare's free tier only proxies HTTP(S)/WS.
A small HTTPS endpoint with a bearer token tunnels cleanly.

## Run with Node

```bash
cd utils/mqtt-bridge
npm install
BRIDGE_TOKEN="$(openssl rand -hex 32)" \
MQTT_URL="mqtt://mosquitto.local:1883" \
MQTT_USERNAME="jellybox" \
MQTT_PASSWORD="..." \
npm start
```

## Run with Docker

```bash
docker build -t jellybox-mqtt-bridge utils/mqtt-bridge
docker run --rm -p 8080:8080 \
  -e BRIDGE_TOKEN="$(openssl rand -hex 32)" \
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
    ports:
      - "8080:8080"
    environment:
      BRIDGE_TOKEN: ${BRIDGE_TOKEN}
      MQTT_URL: mqtt://mosquitto:1883
      MQTT_USERNAME: jellybox
      MQTT_PASSWORD: ${MQTT_PASSWORD}
```

## Configuration

| Env var          | Required | Default     | Notes                                       |
| ---------------- | -------- | ----------- | ------------------------------------------- |
| `BRIDGE_TOKEN`   | yes      | —           | Shared secret. Sent as `Authorization: Bearer <token>`. Generate with `openssl rand -hex 32`. |
| `MQTT_URL`       | yes      | —           | Internal broker URL, e.g. `mqtt://mosquitto:1883` |
| `MQTT_USERNAME`  | no       | —           | Mosquitto credentials                       |
| `MQTT_PASSWORD`  | no       | —           |                                             |
| `PORT`           | no       | `8080`      | HTTP listen port                            |
| `HOST`           | no       | `0.0.0.0`   | Bind address                                |
| `MAX_BODY_BYTES` | no       | `65536`     | Reject larger POST bodies                   |

## HTTP API

### `GET /healthz`

Returns `200 { ok: true, mqtt: "connected" }` once the bridge has linked to the
broker, `503` otherwise. Useful for tunnel/uptime health checks.

### `POST /publish`

Auth required. Body is a single message object or an array of messages:

```json
{ "topic": "jellybox/device/abc/last_seen", "payload": "2026-05-19T18:00:00Z", "retain": true, "qos": 0 }
```

```json
[
  { "topic": "homeassistant/sensor/.../config", "payload": "{...}", "retain": true },
  { "topic": "jellybox/.../state", "payload": "...", "retain": true }
]
```

Responses:
- `200 { ok: true, count: N }` — all messages published
- `400` — bad JSON or schema
- `401` — missing/wrong bearer token
- `413` — body exceeds `MAX_BODY_BYTES`
- `502` — MQTT publish failed
- `503` — bridge has not connected to MQTT yet

## Exposing to the internet

### Cloudflare Tunnel

```bash
cloudflared tunnel --hostname mqtt-bridge.example.com --url http://localhost:8080
```

Then set in Vercel:

```
MQTT_URL=https://mqtt-bridge.example.com
MQTT_BRIDGE_TOKEN=<same value as BRIDGE_TOKEN>
```

### Tailscale Funnel

```bash
tailscale serve --bg --https=443 http://localhost:8080
tailscale funnel 443 on
```

Use the resulting `https://<machine>.ts.net` URL as `MQTT_URL` in Vercel.

## Configuring the Jellybox server

In `apps/server/.env.local` (or Vercel project settings):

```
MQTT_URL=https://mqtt-bridge.example.com
MQTT_BRIDGE_TOKEN=<BRIDGE_TOKEN value>
```

When `MQTT_URL` begins with `http://` or `https://`, the server speaks
HTTP to the bridge. When it begins with `mqtt://`, `mqtts://`, `ws://`,
or `wss://`, the server connects directly to a broker (useful if your
broker is on Tailscale and reachable by hostname without a bridge).
