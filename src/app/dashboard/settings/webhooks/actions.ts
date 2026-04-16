'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'

const RETRY_EVENTS = ['JELLYFIN_OFFLINE'] as const

const createWebhookSchema = z.object({
  label: z.string().min(1, 'Label is required').max(64),
  url: z.string().url('Must be a valid URL'),
  event: z.enum(['JELLYFIN_OFFLINE', 'TAG_SCANNED', 'PLAYBACK_FAILED']),
  retryDelaySeconds: z.number().int().min(0).max(55),
}).refine(
  (d) => !RETRY_EVENTS.includes(d.event as typeof RETRY_EVENTS[number]) || d.retryDelaySeconds >= 5,
  { message: 'Retry delay must be at least 5 seconds for Jellyfin Offline webhooks', path: ['retryDelaySeconds'] },
)

export async function createWebhookAction(
  data: z.infer<typeof createWebhookSchema>,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const parsed = createWebhookSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }

  await db.webhook.create({
    data: {
      userId: session.user.id,
      label: parsed.data.label,
      url: parsed.data.url,
      event: parsed.data.event,
      retryDelaySeconds: parsed.data.retryDelaySeconds,
    },
  })

  revalidatePath('/dashboard/settings/webhooks')
  return { success: true }
}

export async function deleteWebhookAction(
  id: string,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  await db.webhook.deleteMany({
    where: { id, userId: session.user.id },
  })

  revalidatePath('/dashboard/settings/webhooks')
  return {}
}
