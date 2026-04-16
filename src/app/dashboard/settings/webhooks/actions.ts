'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'

const createWebhookSchema = z.object({
  label: z.string().min(1, 'Label is required').max(64),
  url: z.string().url('Must be a valid URL'),
  event: z.enum(['JELLYFIN_OFFLINE']),
  retryDelaySeconds: z.number().int().min(5).max(55),
})

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
