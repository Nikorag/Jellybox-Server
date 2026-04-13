'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'

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
