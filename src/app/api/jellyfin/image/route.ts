import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getActiveAccountId } from '@/lib/context'
import { JELLYFIN_REQUEST_TIMEOUT_MS } from '@/lib/constants'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse('Unauthorised', { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  const tag = searchParams.get('tag')

  if (!itemId) {
    return new NextResponse('Missing itemId', { status: 400 })
  }

  const accountId = await getActiveAccountId(session.user.id)

  const server = await db.jellyfinServer.findUnique({
    where: { userId: accountId },
  })
  if (!server) {
    return new NextResponse('No Jellyfin server linked', { status: 404 })
  }

  const apiToken = decrypt(server.apiToken)
  const customHeaders = server.customHeaders
    ? (() => { try { return JSON.parse(decrypt(server.customHeaders!)) as Record<string, string> } catch { return {} } })()
    : {}
  const base = server.serverUrl.replace(/\/$/, '')
  const imageUrl = tag
    ? `${base}/Items/${itemId}/Images/Primary?tag=${tag}`
    : `${base}/Items/${itemId}/Images/Primary`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), JELLYFIN_REQUEST_TIMEOUT_MS)

  try {
    const upstream = await fetch(imageUrl, {
      headers: { ...customHeaders, 'X-Emby-Token': apiToken },
      signal: controller.signal,
    })

    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status })
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
    const body = await upstream.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
