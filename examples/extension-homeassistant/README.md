# Home Assistant Scripts extension for Jellybox

Tag a Jellybox tag with a Home Assistant script. Scanning the tag triggers
the script. The script itself decides what happens — play a song on a
specific speaker, dim the lights, change the TV channel — Jellybox just
calls `script.turn_on`.

## How it fits the contract

- **Auth**: credentials, one field — a Home Assistant **long-lived access
  token**. Tokens never leave this extension; Jellybox stores only the opaque
  `accountId` it gets back.
- **Search**: lists every entity whose `entity_id` starts with `script.`,
  filtered client-side by a substring match on the friendly name or the
  entity id.
- **Play**: `POST /api/services/script/turn_on` to Home Assistant with
  `{ entity_id: <script.…> }`.
- **Clients**: not used. `capabilities.listClients = false` tells Jellybox
  to skip the default-client picker, since each script is self-contained.

## Setup

### 1. Make a long-lived access token in Home Assistant

In Home Assistant, click your profile (bottom-left) → **Security** tab →
**Long-lived access tokens** → Create token. Copy it; you can't see it
again.

### 2. Run the extension

```bash
HOMEASSISTANT_URL=http://homeassistant.local:8123 \
JELLYBOX_BEARER_SECRET=jbe_... \
node server.mjs
```

| Env var | Purpose |
|---|---|
| `PORT` | Port to listen on (default 4557) |
| `HOMEASSISTANT_URL` | **Required.** Base URL of your HA instance, no trailing slash. |
| `JELLYBOX_BEARER_SECRET` | The secret Jellybox issued at registration. If unset, any bearer is accepted (dev only). |
| `ACCOUNTS_FILE` | Path to the JSON file that persists `accountId → token` mappings. Defaults to `accounts.json` next to `server.mjs`. The file is created with `0600` permissions and contains long-lived HA tokens — gitignored, treat like any secret. |

### 3. Register in Jellybox

Sign in as an admin (your email in `ADMINS`), open
**Settings → Extensions → Add extension**, paste the URL where this server
is reachable from Jellybox. Copy the issued bearer secret into
`JELLYBOX_BEARER_SECRET` and restart the extension.

Then any user can click **Connect**, paste their HA long-lived token, and
start tagging scripts.

## Hosting

The extension only needs to be reachable **from Jellybox**, not from the
public internet. The simplest setup is a sidecar on the same Docker network
as your Home Assistant install:

```yaml
# docker-compose.yml fragment
services:
  jellybox-ha-extension:
    image: node:22-alpine
    working_dir: /app
    volumes: [./extension-homeassistant:/app]
    command: node server.mjs
    environment:
      HOMEASSISTANT_URL: http://homeassistant:8123
      JELLYBOX_BEARER_SECRET: jbe_...
    networks: [jellybox]
```

Then register the URL in Jellybox as `http://jellybox-ha-extension:4557`.

## Example HA scripts that work well as Jellybox tags

```yaml
script:
  play_train_song:
    alias: Play train song on living-room speaker
    sequence:
      - service: media_player.play_media
        target:
          entity_id: media_player.living_room
        data:
          media_content_id: spotify:track:6cBeNCWfBhJxyP9MGJuXw7
          media_content_type: music
          enqueue: replace
      - service: media_player.volume_set
        target:
          entity_id: media_player.living_room
        data:
          volume_level: 0.4

  storytime_lights:
    alias: Storytime lights
    sequence:
      - service: light.turn_on
        target:
          area_id: bedroom
        data:
          brightness_pct: 25
          color_name: warm_white
```

Each one becomes a tag candidate in Jellybox once the extension is connected.

## Limitations / things this reference deliberately doesn't do

- **No script variables.** Jellybox's `flags` field (`resumePlayback`,
  `shuffle`) is ignored. A more elaborate extension could map them onto
  Home Assistant script variables, but that's outside the v1 contract.
- **No automations / scenes / actions.** Only the `script.*` domain is
  surfaced. Easy to extend if you want — broaden the prefix filter and
  branch on the entity domain when calling `*/turn_on`.
- **Self-signed HTTPS isn't handled.** If your HA is on an HTTPS URL with a
  self-signed cert, point this extension at the plain-HTTP internal address
  instead (Docker-network or LAN).
