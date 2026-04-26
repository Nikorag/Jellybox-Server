// HTTP contract for Jellybox extensions.
//
// Extensions are out-of-process HTTP services (Lambda or sidecar). Jellybox
// authenticates every call except GET /manifest with a bearer secret generated
// at registration time. The full route list:
//
//   GET  /manifest                                                → ExtensionManifest
//   POST /authenticate/start      { state, callbackUrl }          → { redirectUrl }   (oauth only)
//   POST /authenticate/exchange   { code, callbackUrl }           → AuthenticateCompleteResult  (oauth only)
//   POST /authenticate/complete   { fields }                      → AuthenticateCompleteResult  (credentials only)
//   POST /search                  { accountId, query }            → { items: MediaItem[] }
//   GET  /item?accountId=&itemId=                                 → MediaItem
//   GET  /image?accountId=&itemId=&kind=primary                   → image bytes
//   GET  /clients?accountId=                                      → { clients: ExtensionClient[] }
//   POST /play  { accountId, itemId, clientId?, flags? }          → PlayResult
//
// Extensions own provider credentials end-to-end. Jellybox stores only the
// opaque `accountId` returned at /authenticate/complete (credentials) or
// /authenticate/exchange (oauth).
//
// OAuth flow (Jellybox hosts the callback so the extension never needs to be
// publicly reachable — handy for sidecars on a private/Docker network):
//   1. Browser clicks "Connect" → Jellybox POSTs /authenticate/start with an
//      encrypted `state` it minted and the Jellybox callback URL.
//   2. Extension returns the provider URL with the OAuth `state` and
//      `redirect_uri` set to the Jellybox callback URL.
//   3. Provider redirects the browser to the Jellybox callback with `state`
//      and `code` (or `error`).
//   4. Jellybox verifies state, calls /authenticate/exchange server-to-server
//      with the `code`. Extension swaps the code for tokens with the provider,
//      persists them keyed to a fresh `accountId`, and returns
//      { accountId, displayName }.
//   5. Jellybox upserts ExtensionAccount.

export type AuthFlow = 'credentials' | 'oauth'

export type AuthField = {
  key: string
  label: string
  /// Render as a password input rather than text.
  secret: boolean
  required: boolean
}

export type ExtensionCapabilities = {
  search: boolean
  listClients: boolean
  images: boolean
}

export type ExtensionManifest = {
  name: string
  version: string
  iconUrl?: string
  authFlow: AuthFlow
  authFields: AuthField[]
  capabilities: ExtensionCapabilities
  /// Free-form item type strings that this extension may return ("track", "movie", …).
  itemTypes: string[]
}

export type AuthenticateCompleteResult = {
  accountId: string
  displayName: string
}

export type MediaItem = {
  id: string
  title: string
  subtitle?: string
  /// Optional remote URL. The Jellybox image proxy uses /image with the item's id when this is absent.
  imageUrl?: string
  type: string
}

export type ExtensionClient = {
  id: string
  name: string
}

export type PlayFlags = {
  resumePlayback?: boolean
  shuffle?: boolean
}

export type PlayErrorCode = 'OFFLINE' | 'NO_CLIENT' | 'AUTH_ERROR' | 'UNKNOWN'

export type PlayResult =
  | { ok: true }
  | { ok: false; code: PlayErrorCode; message: string }
