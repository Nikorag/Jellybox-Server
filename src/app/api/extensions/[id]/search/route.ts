import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ExtensionApiError, search } from '@/lib/extensions/client'
import { loadExtension, loadOwnAccount, requireSession } from '@/lib/extensions/server'

type RouteContext = { params: Promise<{ id: string }> }

const searchSchema = z.object({
  query: z.string().min(1),
})

export async function POST(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  const ext = await loadExtension(id)
  if (ext instanceof NextResponse) return ext

  const account = await loadOwnAccount(id, user.id)
  if (!account) {
    return NextResponse.json({ error: 'Connect this extension first.' }, { status: 409 })
  }

  const parsed = searchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    )
  }

  try {
    const items = await search(ext, account.accountId, parsed.data.query)
    return NextResponse.json({ data: items })
  } catch (err) {
    if (err instanceof ExtensionApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 })
  }
}
