'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'
import { jellyfinGetSystemInfo, JellyfinApiError } from '@/lib/jellyfin'

export async function saveCustomHeadersAction(
  headers: Record<string, string>,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const encryptedHeaders =
    Object.keys(headers).length > 0 ? encrypt(JSON.stringify(headers)) : null

  await db.jellyfinServer.updateMany({
    where: { userId: session.user.id },
    data: { customHeaders: encryptedHeaders },
  })

  revalidatePath('/dashboard/jellyfin')
  return {}
}

export async function testJellyfinConnectionAction(): Promise<{
  ok: boolean
  serverName?: string
  error?: string
}> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: 'Unauthorised' }

  const server = await db.jellyfinServer.findUnique({
    where: { userId: session.user.id },
  })
  if (!server) return { ok: false, error: 'No Jellyfin server linked.' }

  let customHeaders: Record<string, string> = {}
  if (server.customHeaders) {
    try { customHeaders = JSON.parse(decrypt(server.customHeaders)) } catch { /* ignore */ }
  }

  try {
    const apiToken = decrypt(server.apiToken)
    const info = await jellyfinGetSystemInfo(server.serverUrl, apiToken, customHeaders)

    await db.jellyfinServer.update({
      where: { id: server.id },
      data: { status: 'CONNECTED', lastCheckedAt: new Date() },
    })
    revalidatePath('/dashboard/jellyfin')
    return { ok: true, serverName: info.ServerName }
  } catch (err) {
    const status =
      err instanceof JellyfinApiError && err.isAuthError ? 'AUTH_ERROR' : 'UNREACHABLE'
    await db.jellyfinServer.update({
      where: { id: server.id },
      data: { status, lastCheckedAt: new Date() },
    })
    revalidatePath('/dashboard/jellyfin')
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Connection failed.',
    }
  }
}

export async function unlinkJellyfinServerAction(): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  await db.jellyfinServer.deleteMany({ where: { userId: session.user.id } })
  revalidatePath('/dashboard/jellyfin')
  return {}
}

export async function saveJellyfinClientAction(
  jellyfinDeviceId: string,
  deviceName: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const server = await db.jellyfinServer.findUnique({
    where: { userId: session.user.id },
  })
  if (!server) return { error: 'No Jellyfin server linked.' }

  await db.jellyfinClient.upsert({
    where: {
      jellyfinServerId_jellyfinDeviceId: {
        jellyfinServerId: server.id,
        jellyfinDeviceId,
      },
    },
    create: {
      userId: session.user.id,
      jellyfinServerId: server.id,
      jellyfinDeviceId,
      deviceName,
      lastSeenAt: new Date(),
    },
    update: { deviceName, lastSeenAt: new Date() },
  })

  revalidatePath('/dashboard/jellyfin/clients')
  return {}
}

export async function renameJellyfinClientAction(
  clientId: string,
  nickname: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const trimmed = nickname.trim()
  await db.jellyfinClient.updateMany({
    where: { id: clientId, userId: session.user.id },
    data: { nickname: trimmed === '' ? null : trimmed },
  })

  revalidatePath('/dashboard/jellyfin/clients')
  revalidatePath('/dashboard/devices')
  return {}
}

export async function deleteJellyfinClientAction(
  clientId: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  await db.jellyfinClient.deleteMany({
    where: { id: clientId, userId: session.user.id },
  })

  revalidatePath('/dashboard/jellyfin/clients')
  return {}
}
