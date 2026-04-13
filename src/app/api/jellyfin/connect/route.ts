import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import {
  jellyfinAuthenticate,
  jellyfinGetSystemInfo,
  JellyfinApiError,
} from '@/lib/jellyfin'

const connectSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('credentials'),
    serverUrl: z.string().url('Invalid server URL'),
    username: z.string().min(1),
    password: z.string().min(1),
  }),
  z.object({
    mode: z.literal('apikey'),
    serverUrl: z.string().url('Invalid server URL'),
    apiKey: z.string().min(1),
  }),
])

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = connectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    )
  }

  const { serverUrl } = parsed.data
  let apiToken: string

  try {
    if (parsed.data.mode === 'credentials') {
      const auth = await jellyfinAuthenticate(
        serverUrl,
        parsed.data.username,
        parsed.data.password,
      )
      apiToken = auth.AccessToken
    } else {
      apiToken = parsed.data.apiKey
    }

    // Validate the token + retrieve server info
    const sysInfo = await jellyfinGetSystemInfo(serverUrl, apiToken)
    const encryptedToken = encrypt(apiToken)

    await db.jellyfinServer.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        serverUrl,
        apiToken: encryptedToken,
        serverId: sysInfo.Id,
        serverName: sysInfo.ServerName,
        status: 'CONNECTED',
        lastCheckedAt: new Date(),
      },
      update: {
        serverUrl,
        apiToken: encryptedToken,
        serverId: sysInfo.Id,
        serverName: sysInfo.ServerName,
        status: 'CONNECTED',
        lastCheckedAt: new Date(),
      },
    })

    return NextResponse.json({
      data: { serverName: sysInfo.ServerName, serverId: sysInfo.Id },
    })
  } catch (err) {
    if (err instanceof JellyfinApiError) {
      const status = err.isUnreachable ? 'UNREACHABLE' : 'AUTH_ERROR'

      // Persist the error status if an existing server record exists
      await db.jellyfinServer.updateMany({
        where: { userId: session.user.id },
        data: { status, lastCheckedAt: new Date() },
      })

      return NextResponse.json({ error: err.message }, { status: 422 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
