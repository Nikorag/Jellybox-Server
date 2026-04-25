import { NextResponse } from 'next/server'
import { ExtensionApiError, getClients } from '@/lib/extensions/client'
import { loadExtension, loadOwnAccount, requireSession } from '@/lib/extensions/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  const ext = await loadExtension(id)
  if (ext instanceof NextResponse) return ext

  const account = await loadOwnAccount(id, user.id)
  if (!account) {
    return NextResponse.json({ error: 'Connect this extension first.' }, { status: 409 })
  }

  try {
    const clients = await getClients(ext, account.accountId)
    return NextResponse.json({ data: clients })
  } catch (err) {
    if (err instanceof ExtensionApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'Failed to fetch clients.' }, { status: 500 })
  }
}
