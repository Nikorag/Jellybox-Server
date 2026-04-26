'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'
import { fireNotifications } from '@/lib/notifications'

const ntfyConfigSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  token: z.string().optional(),
})

const webhookConfigSchema = z.object({
  webhookUrl: z.string().url('Must be a valid URL'),
})

const createChannelSchema = z.object({
  label: z.string().min(1, 'Label is required').max(64),
  type: z.enum(['NTFY', 'DISCORD', 'SLACK']),
  events: z.array(z.enum(['TAG_SCANNED', 'PLAYBACK_FAILED'])).min(1, 'Select at least one event'),
  config: z.record(z.string().optional()),
})

export async function createNotificationChannelAction(
  data: z.infer<typeof createChannelSchema>,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const parsed = createChannelSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }

  const configResult =
    parsed.data.type === 'NTFY'
      ? ntfyConfigSchema.safeParse(parsed.data.config)
      : webhookConfigSchema.safeParse(parsed.data.config)

  if (!configResult.success) return { error: configResult.error.errors[0]?.message ?? 'Invalid config.' }

  await db.notificationChannel.create({
    data: {
      userId: session.user.id,
      type: parsed.data.type,
      label: parsed.data.label,
      events: parsed.data.events,
      config: encrypt(JSON.stringify(configResult.data)),
    },
  })

  revalidatePath('/dashboard/settings/notifications')
  return { success: true }
}

export async function deleteNotificationChannelAction(
  id: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  await db.notificationChannel.deleteMany({
    where: { id, userId: session.user.id },
  })

  revalidatePath('/dashboard/settings/notifications')
  return {}
}

export async function testNotificationChannelAction(
  id: string,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const channel = await db.notificationChannel.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!channel) return { error: 'Channel not found.' }

  try {
    decrypt(channel.config)
  } catch {
    return { error: 'Channel config is unreadable.' }
  }

  await fireNotifications(session.user.id, {
    event: 'TAG_SCANNED',
    deviceName: 'Test Device',
    contentTitle: 'Test notification from Jellybox',
  }, [channel])

  return { success: true }
}

export async function toggleNotificationChannelAction(
  id: string,
  enabled: boolean,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  await db.notificationChannel.updateMany({
    where: { id, userId: session.user.id },
    data: { enabled },
  })

  revalidatePath('/dashboard/settings/notifications')
  return {}
}
