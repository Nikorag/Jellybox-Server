import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { jellyfinBrowseLibrary, JellyfinApiError, type JellyfinItemType } from '@/lib/jellyfin'
import { JELLYFIN_LIBRARY_PAGE_SIZE } from '@/lib/constants'

const querySchema = z.object({
  search: z.string().optional(),
  types: z.string().optional(),
  startIndex: z.coerce.number().min(0).default(0),
  limit: z.coerce.number().min(1).max(100).default(JELLYFIN_LIBRARY_PAGE_SIZE),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const server = await db.jellyfinServer.findUnique({
    where: { userId: session.user.id },
  })
  if (!server) {
    return NextResponse.json({ error: 'No Jellyfin server linked.' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters.' }, { status: 400 })
  }

  const { search, types, startIndex, limit } = parsed.data
  const typeList = types
    ? (types.split(',') as JellyfinItemType[])
    : undefined

  try {
    const apiToken = decrypt(server.apiToken)
    const result = await jellyfinBrowseLibrary(server.serverUrl, apiToken, {
      search,
      types: typeList,
      startIndex,
      limit,
    })
    return NextResponse.json({ data: result })
  } catch (err) {
    if (err instanceof JellyfinApiError) {
      const status = err.isUnreachable ? 'UNREACHABLE' : 'AUTH_ERROR'
      await db.jellyfinServer.update({
        where: { id: server.id },
        data: { status, lastCheckedAt: new Date() },
      })
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
