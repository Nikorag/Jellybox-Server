'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { generateDeviceApiKey } from '@/lib/crypto'

const createDeviceSchema = z.object({
  name: z.string().min(1, 'Device name is required').max(64),
})

const updateDeviceSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  defaultClientId: z.string().nullable().optional(),
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

  const parsed = createDeviceSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const { rawKey, hash, prefix } = await generateDeviceApiKey()

  const device = await db.device.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      apiKeyHash: hash,
      apiKeyPrefix: prefix,
    },
  })

  revalidatePath('/dashboard/devices')
  return { rawKey, deviceId: device.id }
}

export async function updateDeviceAction(
  deviceId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const parsed = updateDeviceSchema.safeParse({
    name: formData.get('name') ?? undefined,
    defaultClientId: formData.get('defaultClientId') ?? undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  await db.device.updateMany({
    where: { id: deviceId, userId: session.user.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.defaultClientId !== undefined && {
        defaultClientId: parsed.data.defaultClientId,
      }),
    },
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

  await db.device.deleteMany({
    where: { id: deviceId, userId: session.user.id },
  })

  revalidatePath('/dashboard/devices')
  return {}
}
