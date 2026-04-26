import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  ExtensionApiError,
  authenticateExchange,
} from '@/lib/extensions/client'
import {
  decodeOAuthState,
  loadExtension,
  publicExtensionShape,
  publicOrigin,
  requireSession,
} from '@/lib/extensions/server'

// Single OAuth completion endpoint — extensionId comes from the encrypted
// state, so the OAuth callback URL doesn't need to know which extension is
// connecting.

const completeSchema = z.object({
  state: z.string().min(1),
  code: z.string().min(1),
})

export async function POST(req: Request) {
  const user = await requireSession()
  if (user instanceof NextResponse) return user

  const parsed = completeSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    )
  }

  const decoded = decodeOAuthState(parsed.data.state)
  if (typeof decoded === 'string') {
    return NextResponse.json({ error: decoded }, { status: 400 })
  }
  if (decoded.userId !== user.id) {
    return NextResponse.json({ error: 'OAuth state did not match this session.' }, { status: 403 })
  }

  const ext = await loadExtension(decoded.extensionId)
  if (ext instanceof NextResponse) return ext

  const callbackUrl = `${publicOrigin(req)}/dashboard/settings/extensions/oauth-callback`

  let result
  try {
    result = await authenticateExchange(ext, parsed.data.code, callbackUrl)
  } catch (err) {
    if (err instanceof ExtensionApiError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Token exchange failed.' }, { status: 500 })
  }

  const account = await db.extensionAccount.upsert({
    where: { extensionId_userId: { extensionId: ext.id, userId: user.id } },
    create: {
      extensionId: ext.id,
      userId: user.id,
      accountId: result.accountId,
      displayName: result.displayName,
    },
    update: {
      accountId: result.accountId,
      displayName: result.displayName,
      defaultClientId: null,
    },
  })

  return NextResponse.json({ data: publicExtensionShape(ext, account) })
}
