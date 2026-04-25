import { NextResponse } from 'next/server'
import { ExtensionApiError, authenticateStart } from '@/lib/extensions/client'
import {
  encodeOAuthState,
  loadExtension,
  publicOrigin,
  requireSession,
} from '@/lib/extensions/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  const ext = await loadExtension(id)
  if (ext instanceof NextResponse) return ext

  const manifest = ext.manifest as { authFlow?: string } | null
  if (manifest?.authFlow !== 'oauth') {
    return NextResponse.json(
      { error: 'This extension does not use OAuth.' },
      { status: 400 },
    )
  }

  // The OAuth provider redirects the browser back to *Jellybox* — the
  // extension never has to be publicly reachable. The callback URL is fixed
  // (no query params) so it can be registered with the OAuth provider once.
  const callbackUrl = `${publicOrigin(req)}/dashboard/settings/extensions/oauth-callback`
  const state = encodeOAuthState(user.id, id)

  try {
    const { redirectUrl } = await authenticateStart(ext, state, callbackUrl)
    return NextResponse.json({ data: { redirectUrl } })
  } catch (err) {
    if (err instanceof ExtensionApiError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Failed to start OAuth flow.' }, { status: 500 })
  }
}
