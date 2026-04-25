# Reference Jellybox Extension

A minimal extension that implements the full Jellybox extension HTTP contract
with canned data. Use it to verify a Jellybox install end-to-end without
needing a real third-party provider.

## Run

```bash
npm start
# or: PORT=5000 node server.mjs
# or: AUTH_FLOW=oauth node server.mjs   # exercise the OAuth flow
```

Listens on `http://localhost:4555` by default.

In OAuth mode the server hosts a fake "Allow / Deny" page at `/fake-oauth`
that stands in for a real provider, plus a callback at `/fake-oauth/callback`.
That's the same shape a real OAuth extension would have, except the redirect
URL would point at the actual provider (Spotify, etc.).

## Try it against Jellybox

1. Start this server.
2. In Jellybox, go to `/dashboard/settings/extensions` and add
   `http://localhost:4555` as a new extension.
3. Connect: enter any non-empty value for the `demoToken` field.
4. The extension exposes one client (`Demo screen`) — pick it as the default.
5. Assign a tag to the demo item (`demo-item-1`) and trigger `/api/play` with
   that tag. This server logs the play call to stdout.

## Contract

See `src/lib/extensions/types.ts` in the Jellybox repo for the full type
definitions. The seven routes implemented here are:

| Method | Path                    | Auth |
| ------ | ----------------------- | ---- |
| GET    | `/manifest`             | none |
| POST   | `/authenticate/complete`| bearer |
| POST   | `/search`               | bearer |
| GET    | `/item`                 | bearer |
| GET    | `/clients`              | bearer |
| POST   | `/play`                 | bearer |
| GET    | `/image`                | not implemented (capabilities.images = false) |

A real extension would persist the credentials it receives at
`/authenticate/complete` keyed by the `accountId` it returns, and use them on
every subsequent call. This reference server has a single hard-coded account.
