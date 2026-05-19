'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { generateDeviceApiKey } from '@/lib/crypto'
import { getActiveAccountId } from '@/lib/context'
import { publishDeviceDiscovery, publishDeviceRemoval } from '@/lib/mqtt'

const createDeviceSchema = z.object({
  name: z.string().min(1, 'Device name is required').max(64),
})

const updateDeviceSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  /// Encoded target: empty string = none, "client:<id>", or "user:<jellyfinUserId>:<displayName>".
  defaultTarget: z.string().optional(),
})

export type CreateDeviceResult =
  | { rawKey: string; deviceId: string; error?: never }
  | { error: string; rawKey?: never; deviceId?: never }

/** Create a new device and generate its API key. Returns the raw key (shown once). */
export async function createDeviceAction(
  formData: FormData,
): Promise<CreateDeviceResult> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const accountId = await getActiveAccountId(session.user.id)

  const parsed = createDeviceSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const { rawKey, hash, prefix } = await generateDeviceApiKey()

  const device = await db.device.create({
    data: {
      userId: accountId,
      name: parsed.data.name,
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
    },
  })

  void publishDeviceDiscovery({ id: device.id, name: device.name })

  revalidatePath('/dashboard/devices')
  return { rawKey, deviceId: device.id }
}

export async function updateDeviceAction(
  deviceId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const accountId = await getActiveAccountId(session.user.id)

  const parsed = updateDeviceSchema.safeParse({
    name: formData.get('name') ?? undefined,
    defaultTarget: formData.get('defaultTarget') ?? undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  let targetUpdate: {
    defaultClientId?: string | null
    defaultJellyfinUserId?: string | null
    defaultJellyfinUserName?: string | null
  } = {}
  if (parsed.data.defaultTarget !== undefined) {
    const raw = parsed.data.defaultTarget
    if (raw === '') {
      targetUpdate = { defaultClientId: null, defaultJellyfinUserId: null, defaultJellyfinUserName: null }
    } else if (raw.startsWith('client:')) {
      const clientId = raw.slice('client:'.length)
      // Verify the client belongs to this account before linking
      const client = await db.jellyfinClient.findFirst({
        where: { id: clientId, userId: accountId },
        select: { id: true },
      })
      if (!client) return { error: 'Unknown Jellyfin client.' }
      targetUpdate = { defaultClientId: clientId, defaultJellyfinUserId: null, defaultJellyfinUserName: null }
    } else if (raw.startsWith('user:')) {
      const rest = raw.slice('user:'.length)
      const sep = rest.indexOf(':')
      const jellyfinUserId = sep >= 0 ? rest.slice(0, sep) : rest
      const jellyfinUserName = sep >= 0 ? rest.slice(sep + 1) : ''
      if (!jellyfinUserId) return { error: 'Invalid Jellyfin user.' }
      targetUpdate = {
        defaultClientId: null,
        defaultJellyfinUserId: jellyfinUserId,
        defaultJellyfinUserName: jellyfinUserName || null,
      }
    } else {
      return { error: 'Invalid playback target.' }
    }
  }

  await db.device.updateMany({
    where: { id: deviceId, userId: accountId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...targetUpdate,
    },
  })

  if (parsed.data.name !== undefined) {
    void publishDeviceDiscovery({ id: deviceId, name: parsed.data.name })
  }

  revalidatePath('/dashboard/devices')
  revalidatePath(`/dashboard/devices/${deviceId}`)
  return {}
}

export async function setFirmwareUpdatePendingAction(
  deviceId: string,
  pending: boolean,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const accountId = await getActiveAccountId(session.user.id)

  await db.device.updateMany({
    where: { id: deviceId, userId: accountId },
    data: { firmwareUpdatePending: pending },
  })

  revalidatePath('/dashboard/devices')
  revalidatePath(`/dashboard/devices/${deviceId}`)
  return {}
}

export async function deleteDeviceAction(
  deviceId: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const accountId = await getActiveAccountId(session.user.id)

  await db.device.deleteMany({
    where: { id: deviceId, userId: accountId },
  })

  void publishDeviceRemoval(deviceId)

  revalidatePath('/dashboard/devices')
  return {}
}
