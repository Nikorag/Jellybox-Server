'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getActiveAccountId } from '@/lib/context'
import type { JellyfinItemType } from '@prisma/client'

const createTagSchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required').max(64),
  label: z.string().min(1, 'Label is required').max(128),
})

const updateTagSchema = z.object({
  label: z.string().min(1).max(128).optional(),
  jellyfinItemId: z.string().nullable().optional(),
  jellyfinItemType: z.string().nullable().optional(),
  jellyfinItemTitle: z.string().nullable().optional(),
  jellyfinItemImageTag: z.string().nullable().optional(),
  resumePlayback: z.boolean().optional(),
  shuffle: z.boolean().optional(),
})

export async function createTagAction(
  formData: FormData,
): Promise<{ error?: string; tagId?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const accountId = await getActiveAccountId(session.user.id)

  const parsed = createTagSchema.safeParse({
    tagId: formData.get('tagId'),
    label: formData.get('label'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const existing = await db.rfidTag.findFirst({
    where: { userId: accountId, tagId: parsed.data.tagId },
  })
  if (existing) {
    return { error: 'A tag with this ID is already registered.' }
  }

  const tag = await db.rfidTag.create({
    data: {
      userId: accountId,
      tagId: parsed.data.tagId,
      label: parsed.data.label,
    },
  })

  revalidatePath('/dashboard/tags')
  return { tagId: tag.id }
}

export async function updateTagAction(
  id: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const accountId = await getActiveAccountId(session.user.id)

  const parsed = updateTagSchema.safeParse({
    label: formData.get('label') ?? undefined,
    jellyfinItemId: formData.get('jellyfinItemId') ?? undefined,
    jellyfinItemType: formData.get('jellyfinItemType') ?? undefined,
    jellyfinItemTitle: formData.get('jellyfinItemTitle') ?? undefined,
    jellyfinItemImageTag: formData.get('jellyfinItemImageTag') ?? undefined,
    resumePlayback: formData.get('resumePlayback') === 'true' ? true : formData.get('resumePlayback') === 'false' ? false : undefined,
    shuffle: formData.get('shuffle') === 'true' ? true : formData.get('shuffle') === 'false' ? false : undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  await db.rfidTag.updateMany({
    where: { id, userId: accountId },
    data: {
      ...(parsed.data.label !== undefined && { label: parsed.data.label }),
      ...(parsed.data.jellyfinItemId !== undefined && {
        jellyfinItemId: parsed.data.jellyfinItemId,
        jellyfinItemType:
          (parsed.data.jellyfinItemType as JellyfinItemType | null) ?? null,
        jellyfinItemTitle: parsed.data.jellyfinItemTitle ?? null,
        jellyfinItemImageTag: parsed.data.jellyfinItemImageTag ?? null,
      }),
      ...(parsed.data.resumePlayback !== undefined && { resumePlayback: parsed.data.resumePlayback }),
      ...(parsed.data.shuffle !== undefined && { shuffle: parsed.data.shuffle }),
    },
  })

  revalidatePath('/dashboard/tags')
  revalidatePath(`/dashboard/tags/${id}`)
  return {}
}

export async function deleteTagAction(id: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const accountId = await getActiveAccountId(session.user.id)

  await db.rfidTag.deleteMany({
    where: { id, userId: accountId },
  })

  revalidatePath('/dashboard/tags')
  return {}
}
