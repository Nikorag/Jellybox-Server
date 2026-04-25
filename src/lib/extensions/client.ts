import { EXTENSION_REQUEST_TIMEOUT_MS } from '@/lib/constants'
import { decrypt } from '@/lib/crypto'
import type {
  AuthenticateCompleteResult,
  ExtensionClient,
  ExtensionManifest,
  MediaItem,
  PlayFlags,
  PlayResult,
} from './types'

/// Minimal shape needed to call an extension. The Prisma `Extension` row satisfies this.
export type ExtensionCallTarget = {
  baseUrl: string
  /// AES-256-GCM ciphertext of the bearer secret.
  secret: string
}

export class ExtensionApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'ExtensionApiError'
  }

  get isUnreachable() {
    return this.statusCode === 0
  }

  get isAuthError() {
    return this.statusCode === 401 || this.statusCode === 403
  }
}

function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}

async function extensionFetch<T>(
  baseUrl: string,
  path: string,
  options: RequestInit & { secret?: string } = {},
): Promise<T> {
  const { secret, headers, ...rest } = options
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), EXTENSION_REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${trimBase(baseUrl)}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        ...(headers ?? {}),
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new ExtensionApiError(
        res.status,
        `Extension returned ${res.status} ${res.statusText} for ${path}`,
      )
    }

    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T
    }

    return (await res.json()) as T
  } catch (err) {
    if (err instanceof ExtensionApiError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new ExtensionApiError(0, `Request to extension timed out (${path}).`)
    }
    throw new ExtensionApiError(0, `Could not reach extension: ${(err as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }
}

function plaintextSecret(target: ExtensionCallTarget): string {
  return decrypt(target.secret)
}

/// Fetch the manifest at registration time (no auth — secret hasn't been generated yet).
export function fetchManifest(baseUrl: string): Promise<ExtensionManifest> {
  return extensionFetch<ExtensionManifest>(baseUrl, '/manifest', { method: 'GET' })
}

export function authenticateComplete(
  target: ExtensionCallTarget,
  fields: Record<string, string>,
): Promise<AuthenticateCompleteResult> {
  return extensionFetch<AuthenticateCompleteResult>(target.baseUrl, '/authenticate/complete', {
    method: 'POST',
    body: JSON.stringify({ fields }),
    secret: plaintextSecret(target),
  })
}

/// Kick off an OAuth flow. Returns the provider URL the user should be sent to.
/// `state` is opaque to the extension — it must round-trip back to Jellybox via
/// the OAuth `state` parameter so Jellybox can verify the callback.
/// `callbackUrl` is the URL the provider should redirect the user back to;
/// the extension uses it as `redirect_uri` when constructing the provider URL.
export function authenticateStart(
  target: ExtensionCallTarget,
  state: string,
  callbackUrl: string,
): Promise<{ redirectUrl: string }> {
  return extensionFetch<{ redirectUrl: string }>(target.baseUrl, '/authenticate/start', {
    method: 'POST',
    body: JSON.stringify({ state, callbackUrl }),
    secret: plaintextSecret(target),
  })
}

/// Exchange an OAuth `code` (received at the Jellybox callback) for an
/// account. Called server-to-server by Jellybox.
export function authenticateExchange(
  target: ExtensionCallTarget,
  code: string,
  callbackUrl: string,
): Promise<AuthenticateCompleteResult> {
  return extensionFetch<AuthenticateCompleteResult>(target.baseUrl, '/authenticate/exchange', {
    method: 'POST',
    body: JSON.stringify({ code, callbackUrl }),
    secret: plaintextSecret(target),
  })
}

export async function search(
  target: ExtensionCallTarget,
  accountId: string,
  query: string,
): Promise<MediaItem[]> {
  const result = await extensionFetch<{ items: MediaItem[] }>(target.baseUrl, '/search', {
    method: 'POST',
    body: JSON.stringify({ accountId, query }),
    secret: plaintextSecret(target),
  })
  return result.items
}

export function getItem(
  target: ExtensionCallTarget,
  accountId: string,
  itemId: string,
): Promise<MediaItem> {
  const params = new URLSearchParams({ accountId, itemId })
  return extensionFetch<MediaItem>(target.baseUrl, `/item?${params}`, {
    method: 'GET',
    secret: plaintextSecret(target),
  })
}

/// Streams the image bytes back without parsing — caller pipes Response.body to its own response.
export async function getImage(
  target: ExtensionCallTarget,
  accountId: string,
  itemId: string,
  kind = 'primary',
): Promise<Response> {
  const params = new URLSearchParams({ accountId, itemId, kind })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), EXTENSION_REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${trimBase(target.baseUrl)}/image?${params}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${plaintextSecret(target)}` },
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new ExtensionApiError(res.status, `Extension image returned ${res.status}`)
    }
    return res
  } catch (err) {
    if (err instanceof ExtensionApiError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new ExtensionApiError(0, 'Image request to extension timed out.')
    }
    throw new ExtensionApiError(0, `Could not fetch image: ${(err as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }
}

export async function getClients(
  target: ExtensionCallTarget,
  accountId: string,
): Promise<ExtensionClient[]> {
  const params = new URLSearchParams({ accountId })
  const result = await extensionFetch<{ clients: ExtensionClient[] }>(
    target.baseUrl,
    `/clients?${params}`,
    { method: 'GET', secret: plaintextSecret(target) },
  )
  return result.clients
}

export function play(
  target: ExtensionCallTarget,
  accountId: string,
  itemId: string,
  clientId: string | null,
  flags: PlayFlags = {},
): Promise<PlayResult> {
  return extensionFetch<PlayResult>(target.baseUrl, '/play', {
    method: 'POST',
    body: JSON.stringify({ accountId, itemId, clientId, flags }),
    secret: plaintextSecret(target),
  })
}
