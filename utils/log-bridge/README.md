# Jellybox Log Bridge

Forwards UDP log broadcasts from Jellybox firmware to a Jellybox Server's
ingest endpoint so admins can watch logs live in the dashboard.

```
[Jellybox device] --(UDP 5514 broadcast)--> [log-bridge] --(HTTPS POST + bearer)--> [Jellybox Server] --(SSE)--> [browser]
```

The server **does not persist** anything — it just fans the lines out to any
authenticated admin currently watching `/dashboard/device-logs`.

## Why a separate process?

UDP broadcasts only travel within a LAN segment. A Vercel-hosted Jellybox
Server can't see them. The bridge runs next to your device (on a NAS, a
Raspberry Pi, or a dev workstation) and uses HTTPS to push to the server.

## Server-side setup

In your Jellybox Server `.env`:

```
DEVICE_LOGS_ENABLED=true
DEVICE_LOGS_INGEST_TOKEN=<some long random string>
ADMINS=you@example.com
```

The Device-logs nav entry only appears for emails in `ADMINS`.

## Run locally

```
JELLYBOX_URL=https://jellybox.example.com \
INGEST_TOKEN=<same value as DEVICE_LOGS_INGEST_TOKEN> \
node index.js
```

## Run with Docker

The bridge needs to **receive UDP broadcasts**, which only works with host
networking — bridge networking won't see broadcast packets from the LAN.

```
docker build -t jellybox-log-bridge .

docker run --rm \
  --network host \
  -e JELLYBOX_URL=https://jellybox.example.com \
  -e INGEST_TOKEN=... \
  jellybox-log-bridge
```

An equivalent commented-out service block lives in the main repo's
`docker-compose.yml`.

## Config

| Variable      | Default    | Purpose                                                                       |
|---------------|------------|-------------------------------------------------------------------------------|
| `JELLYBOX_URL`  | (required) | Base URL of the Jellybox Server (no trailing slash needed).                  |
| `INGEST_TOKEN`  | (required) | Bearer token. Must match the server's `DEVICE_LOGS_INGEST_TOKEN`.            |
| `UDP_PORT`      | `5514`     | UDP port to listen on. Must match the firmware's `UDP_LOG_PORT`.             |
| `UDP_BIND`      | `0.0.0.0`  | Bind address.                                                                 |
| `FLUSH_MS`      | `250`      | Batching window before POSTing accumulated lines.                            |
| `MAX_BATCH`     | `100`      | Force a flush once this many lines are queued (bursts during boot).          |
| `FILTER_IP`     | unset      | If set, only forward packets coming from this source IP.                     |

## Firmware side

Default in `Config.h`:

```
#define UDP_LOG_HOST   "255.255.255.255"
#define UDP_LOG_PORT   5514
```

If your AP filters broadcast traffic, override `UDP_LOG_HOST` with the bridge
machine's IP and reflash.

## Quick sanity-test without a device

```
echo "12345 hello from a fake device" | nc -u -w1 -b 255.255.255.255 5514
```
