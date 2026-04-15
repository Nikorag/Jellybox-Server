import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getActiveAccountId } from '@/lib/context'
import { jellyfinGetSessions, JellyfinApiError } from '@/lib/jellyfin'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const accountId = await getActiveAccountId(session.user.id)

  const server = await db.jellyfinServer.findUnique({
    where: { userId: accountId },
  })
  if (!server) {
    return NextResponse.json({ error: 'No Jellyfin server linked.' }, { status: 404 })
  }

  try {
    const apiToken = decrypt(server.apiToken)
    const sessions = await jellyfinGetSessions(server.serverUrl, apiToken)

    // Filter to sessions that have a DeviceId (i.e. actual playback clients)
    const clients = sessions
      .filter((s) => s.DeviceId && s.DeviceName)
      .map((s) => ({
        jellyfinDeviceId: s.DeviceId,
        deviceName: s.DeviceName,
        client: s.Client,
        userName: s.UserName,
        isPlaying: !!s.NowPlayingItem,
        lastActivity: s.LastActivityDate,
      }))

    return NextResponse.json({ data: clients })
  } catch (err) {
    if (err instanceof JellyfinApiError) {
      return NextResponse.json({ error: err.message }, { status: 502 })
    }
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}
