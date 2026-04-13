'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
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
})

export async function createTagAction(
  formData: FormData,
): Promise<{ error?: string; tagId?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const parsed = createTagSchema.safeParse({
    tagId: formData.get('tagId'),
    label: formData.get('label'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const existing = await db.rfidTag.findFirst({
    where: { userId: session.user.id, tagId: parsed.data.tagId },
  })
  if (existing) {
    return { error: 'A tag with this ID is already registered.' }
  }

  const tag = await db.rfidTag.create({
    data: {
      userId: session.user.id,
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

  const parsed = updateTagSchema.safeParse({
    label: formData.get('label') ?? undefined,
    jellyfinItemId: formData.get('jellyfinItemId') ?? undefined,
    jellyfinItemType: formData.get('jellyfinItemType') ?? undefined,
    jellyfinItemTitle: formData.get('jellyfinItemTitle') ?? undefined,
    jellyfinItemImageTag: formData.get('jellyfinItemImageTag') ?? undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  await db.rfidTag.updateMany({
    where: { id, userId: session.user.id },
    data: {
      ...(parsed.data.label !== undefined && { label: parsed.data.label }),
      ...(parsed.data.jellyfinItemId !== undefined && {
        jellyfinItemId: parsed.data.jellyfinItemId,
        jellyfinItemType:
          (parsed.data.jellyfinItemType as JellyfinItemType | null) ?? null,
        jellyfinItemTitle: parsed.data.jellyfinItemTitle ?? null,
        jellyfinItemImageTag: parsed.data.jellyfinItemImageTag ?? null,
      }),
    },
  })

  revalidatePath('/dashboard/tags')
  revalidatePath(`/dashboard/tags/${id}`)
  return {}
}

export async function deleteTagAction(id: string): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  await db.rfidTag.deleteMany({
    where: { id, userId: session.user.id },
  })

  revalidatePath('/dashboard/tags')
  return {}
}
