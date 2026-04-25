'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { getActiveAccountId } from '@/lib/context'
import type { JellyfinItemType } from '@prisma/client'

// Both action schemas accept either a Jellyfin assignment or an extension
// assignment. The action enforces that Jellyfin and extension fields don't
// coexist on the same tag — setting one clears the other.

const tagAssignmentSchema = z.object({
  // Jellyfin
  jellyfinItemId: z.string().optional(),
  jellyfinItemType: z.string().optional(),
  jellyfinItemTitle: z.string().optional(),
  jellyfinItemImageTag: z.string().optional(),
  // Extension
  extensionId: z.string().optional(),
  externalItemId: z.string().optional(),
  externalItemType: z.string().optional(),
  externalItemTitle: z.string().optional(),
})

const createTagSchema = tagAssignmentSchema.extend({
  tagId: z.string().min(1, 'Tag ID is required').max(64),
  label: z.string().min(1, 'Label is required').max(128),
  resumePlayback: z.boolean().optional(),
  shuffle: z.boolean().optional(),
})

const updateTagSchema = tagAssignmentSchema.extend({
  label: z.string().min(1).max(128).optional(),
  resumePlayback: z.boolean().optional(),
  shuffle: z.boolean().optional(),
})

type AssignmentFields = z.infer<typeof tagAssignmentSchema>

/// Return the assignment columns to write, ensuring at most one source is set.
function buildAssignmentData(parsed: AssignmentFields) {
  const hasJellyfin = !!parsed.jellyfinItemId
  const hasExtension = !!parsed.extensionId && !!parsed.externalItemId

  if (hasJellyfin && hasExtension) {
    throw new Error('Cannot assign both Jellyfin and an extension to the same tag.')
  }

  if (hasJellyfin) {
    return {
      jellyfinItemId: parsed.jellyfinItemId!,
      jellyfinItemType: (parsed.jellyfinItemType as JellyfinItemType | null) ?? null,
      jellyfinItemTitle: parsed.jellyfinItemTitle ?? null,
      jellyfinItemImageTag: parsed.jellyfinItemImageTag ?? null,
      extensionId: null,
      externalItemId: null,
      externalItemType: null,
      externalItemTitle: null,
      externalItemImageId: null,
    }
  }

  if (hasExtension) {
    return {
      jellyfinItemId: null,
      jellyfinItemType: null,
      jellyfinItemTitle: null,
      jellyfinItemImageTag: null,
      extensionId: parsed.extensionId!,
      externalItemId: parsed.externalItemId!,
      externalItemType: parsed.externalItemType ?? null,
      externalItemTitle: parsed.externalItemTitle ?? null,
      externalItemImageId: null,
    }
  }

  // No assignment — clear everything.
  return {
    jellyfinItemId: null,
    jellyfinItemType: null,
    jellyfinItemTitle: null,
    jellyfinItemImageTag: null,
    extensionId: null,
    externalItemId: null,
    externalItemType: null,
    externalItemTitle: null,
    externalItemImageId: null,
  }
}

function readBool(value: FormDataEntryValue | null): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

function readString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function createTagAction(
  formData: FormData,
): Promise<{ error?: string; tagId?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const accountId = await getActiveAccountId(session.user.id)

  const parsed = createTagSchema.safeParse({
    tagId: formData.get('tagId'),
    label: formData.get('label'),
    jellyfinItemId: readString(formData.get('jellyfinItemId')),
    jellyfinItemType: readString(formData.get('jellyfinItemType')),
    jellyfinItemTitle: readString(formData.get('jellyfinItemTitle')),
    jellyfinItemImageTag: readString(formData.get('jellyfinItemImageTag')),
    extensionId: readString(formData.get('extensionId')),
    externalItemId: readString(formData.get('externalItemId')),
    externalItemType: readString(formData.get('externalItemType')),
    externalItemTitle: readString(formData.get('externalItemTitle')),
    resumePlayback: readBool(formData.get('resumePlayback')),
    shuffle: readBool(formData.get('shuffle')),
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

  let assignmentData
  try {
    assignmentData = buildAssignmentData(parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Invalid assignment.' }
  }

  const tag = await db.rfidTag.create({
    data: {
      userId: accountId,
      tagId: parsed.data.tagId,
      label: parsed.data.label,
      ...assignmentData,
      ...(parsed.data.resumePlayback !== undefined && { resumePlayback: parsed.data.resumePlayback }),
      ...(parsed.data.shuffle !== undefined && { shuffle: parsed.data.shuffle }),
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
    label: readString(formData.get('label')),
    jellyfinItemId: readString(formData.get('jellyfinItemId')),
    jellyfinItemType: readString(formData.get('jellyfinItemType')),
    jellyfinItemTitle: readString(formData.get('jellyfinItemTitle')),
    jellyfinItemImageTag: readString(formData.get('jellyfinItemImageTag')),
    extensionId: readString(formData.get('extensionId')),
    externalItemId: readString(formData.get('externalItemId')),
    externalItemType: readString(formData.get('externalItemType')),
    externalItemTitle: readString(formData.get('externalItemTitle')),
    resumePlayback: readBool(formData.get('resumePlayback')),
    shuffle: readBool(formData.get('shuffle')),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  let assignmentData
  try {
    assignmentData = buildAssignmentData(parsed.data)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Invalid assignment.' }
  }

  await db.rfidTag.updateMany({
    where: { id, userId: accountId },
    data: {
      ...(parsed.data.label !== undefined && { label: parsed.data.label }),
      ...assignmentData,
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
