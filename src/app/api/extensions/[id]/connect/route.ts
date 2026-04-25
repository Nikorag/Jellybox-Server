import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { ExtensionApiError, authenticateComplete } from '@/lib/extensions/client'
import {
  loadExtension,
  publicExtensionShape,
  requireSession,
} from '@/lib/extensions/server'

type RouteContext = { params: Promise<{ id: string }> }

const connectSchema = z.object({
  fields: z.record(z.string(), z.string()),
})

export async function POST(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  const ext = await loadExtension(id)
  if (ext instanceof NextResponse) return ext

  const parsed = connectSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    )
  }

  try {
    const result = await authenticateComplete(ext, parsed.data.fields)
    const account = await db.extensionAccount.upsert({
      where: { extensionId_userId: { extensionId: id, userId: user.id } },
      create: {
        extensionId: id,
        userId: user.id,
        accountId: result.accountId,
        displayName: result.displayName,
      },
      update: {
        accountId: result.accountId,
        displayName: result.displayName,
        // Reset default client when reconnecting — clientIds may not be stable.
        defaultClientId: null,
      },
    })
    return NextResponse.json({ data: publicExtensionShape(ext, account) })
  } catch (err) {
    if (err instanceof ExtensionApiError) {
      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'Connect failed.' }, { status: 500 })
  }
}
