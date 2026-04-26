import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loadExtension, requireSession } from '@/lib/extensions/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  if (!user.admin) {
    return NextResponse.json({ error: 'Only admins can remove extensions.' }, { status: 403 })
  }
  const ext = await loadExtension(id)
  if (ext instanceof NextResponse) return ext

  await db.extension.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
