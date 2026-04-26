import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { isExtensionsAdmin } from '@/lib/auth-flags'
import { decrypt, encrypt } from '@/lib/crypto'
import type { Extension, ExtensionAccount } from '@prisma/client'

/// 10-minute window for OAuth flows to complete.
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

type OAuthStatePayload = {
  userId: string
  extensionId: string
  exp: number
}

/// Mint an opaque, encrypted `state` value that round-trips through the
/// OAuth provider and back. Decrypts only on the same Jellybox instance —
/// no DB row needed.
export function encodeOAuthState(userId: string, extensionId: string): string {
  const payload: OAuthStatePayload = {
    userId,
    extensionId,
    exp: Date.now() + OAUTH_STATE_TTL_MS,
  }
  return encrypt(JSON.stringify(payload))
}

/// Build the public origin from the inbound request headers. Uses
/// X-Forwarded-{Host,Proto} when present (reverse-proxy deploys), then the
/// Host header (covers `next dev -H 0.0.0.0` where req.url has the bind
/// address, not the browser's). Falls back to req.url as a last resort.
export function publicOrigin(req: Request): string {
  const fwdHost = req.headers.get('x-forwarded-host')
  const fwdProto = req.headers.get('x-forwarded-proto')
  const host = fwdHost ?? req.headers.get('host')
  if (host) {
    const proto = fwdProto ?? (new URL(req.url).protocol.replace(':', ''))
    return `${proto}://${host}`
  }
  return new URL(req.url).origin
}

/// Returns the payload, or a string error if invalid/expired.
export function decodeOAuthState(state: string): OAuthStatePayload | string {
  try {
    const payload = JSON.parse(decrypt(state)) as OAuthStatePayload
    if (typeof payload.userId !== 'string' || typeof payload.extensionId !== 'string') {
      return 'Malformed state.'
    }
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return 'OAuth state expired — please retry.'
    }
    return payload
  } catch {
    return 'Invalid OAuth state.'
  }
}

export type AuthedUser = { id: string; email: string | null; admin: boolean }

/// Resolves the signed-in user. Returns a NextResponse to short-circuit when not signed in.
export async function requireSession(): Promise<AuthedUser | NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    admin: isExtensionsAdmin(session.user.email),
  }
}

/// Loads any (system-wide) extension by id. No ownership check.
export async function loadExtension(
  extensionId: string,
): Promise<Extension | NextResponse> {
  const ext = await db.extension.findUnique({ where: { id: extensionId } })
  if (!ext) return NextResponse.json({ error: 'Extension not found.' }, { status: 404 })
  return ext
}

/// Returns the user's own connected account for this extension, or null if not connected.
export function loadOwnAccount(
  extensionId: string,
  userId: string,
): Promise<ExtensionAccount | null> {
  return db.extensionAccount.findUnique({
    where: { extensionId_userId: { extensionId, userId } },
  })
}

/// Public projection — strips encrypted secret. Includes the *caller's* own account state.
export function publicExtensionShape(
  extension: Extension,
  ownAccount: ExtensionAccount | null,
) {
  return {
    id: extension.id,
    name: extension.name,
    baseUrl: extension.baseUrl,
    manifest: extension.manifest,
    enabled: extension.enabled,
    createdAt: extension.createdAt,
    account: ownAccount
      ? { displayName: ownAccount.displayName, defaultClientId: ownAccount.defaultClientId }
      : null,
  }
}
