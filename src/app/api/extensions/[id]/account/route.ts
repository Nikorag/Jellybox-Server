import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { loadExtension, requireSession } from '@/lib/extensions/server'

type RouteContext = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  defaultClientId: z.string().nullable(),
})

export async function PATCH(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  const ext = await loadExtension(id)
  if (ext instanceof NextResponse) return ext

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    )
  }

  const account = await db.extensionAccount.update({
    where: { extensionId_userId: { extensionId: id, userId: user.id } },
    data: { defaultClientId: parsed.data.defaultClientId },
  })

  return NextResponse.json({ data: { defaultClientId: account.defaultClientId } })
}

/// Disconnect the caller's own account from this extension.
export async function DELETE(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  const ext = await loadExtension(id)
  if (ext instanceof NextResponse) return ext

  await db.extensionAccount.deleteMany({ where: { extensionId: id, userId: user.id } })
  return NextResponse.json({ success: true })
}
