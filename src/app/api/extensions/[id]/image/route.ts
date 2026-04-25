import { NextResponse } from 'next/server'
import { ExtensionApiError, getImage } from '@/lib/extensions/client'
import { loadExtension, loadOwnAccount, requireSession } from '@/lib/extensions/server'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: RouteContext) {
  const { id } = await ctx.params
  const user = await requireSession()
  if (user instanceof NextResponse) return user
  const ext = await loadExtension(id)
  if (ext instanceof NextResponse) return ext

  const account = await loadOwnAccount(id, user.id)
  if (!account) {
    return new NextResponse('Connect this extension first', { status: 409 })
  }

  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  const kind = searchParams.get('kind') ?? 'primary'
  if (!itemId) {
    return new NextResponse('Missing itemId', { status: 400 })
  }

  try {
    const upstream = await getImage(ext, account.accountId, itemId, kind)
    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (err) {
    if (err instanceof ExtensionApiError) {
      return new NextResponse(null, { status: err.isUnreachable ? 502 : err.statusCode })
    }
    return new NextResponse(null, { status: 500 })
  }
}
