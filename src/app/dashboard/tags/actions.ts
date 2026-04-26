'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { getActiveAccountId } from '@/lib/context'
import { attemptExtensionPlay, attemptJellyfinPlay } from '@/lib/play/dispatch'
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
  externalItemImageUrl: z.string().optional(),
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
      externalItemImageUrl: null,
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
      externalItemImageUrl: parsed.externalItemImageUrl ?? null,
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
    externalItemImageUrl: null,
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
    externalItemImageUrl: readString(formData.get('externalItemImageUrl')),
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
    externalItemImageUrl: readString(formData.get('externalItemImageUrl')),
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

/// Trigger a tag's play action from the dashboard (no physical scan required).
/// Mirrors /api/play's dispatch but skips the device-side checks (rate limit,
/// debounce, scan-capture, operating hours) since this is the user pressing a
/// button in their own dashboard. For Jellyfin tags it picks the active
/// account's first device with a default client; for extension tags it uses
/// the user's ExtensionAccount default client.
export async function triggerTagAction(
  id: string,
): Promise<{ success?: boolean; content?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const accountId = await getActiveAccountId(session.user.id)

  const tag = await db.rfidTag.findFirst({
    where: { id, userId: accountId },
  })
  if (!tag) return { error: 'Tag not found.' }

  const isExtensionTag = !!tag.extensionId && !!tag.externalItemId
  if (!tag.jellyfinItemId && !isExtensionTag) {
    return { error: 'This tag has no content assigned.' }
  }

  let result
  if (isExtensionTag) {
    const [extension, account] = await Promise.all([
      db.extension.findUnique({ where: { id: tag.extensionId! } }),
      db.extensionAccount.findUnique({
        where: { extensionId_userId: { extensionId: tag.extensionId!, userId: accountId } },
      }),
    ])
    if (!extension || !account) return { error: 'Extension is not connected for this account.' }
    const manifest = extension.manifest as { capabilities?: { listClients?: boolean } } | null
    if (manifest?.capabilities?.listClients !== false && !account.defaultClientId) {
      return { error: 'No default playback client set for this extension.' }
    }
    result = await attemptExtensionPlay({
      extension,
      accountId: account.accountId,
      clientId: account.defaultClientId,
      externalItemId: tag.externalItemId!,
      title: tag.externalItemTitle ?? undefined,
      flags: { resumePlayback: tag.resumePlayback, shuffle: tag.shuffle },
    })
  } else {
    const device = await db.device.findFirst({
      where: { userId: accountId, defaultClientId: { not: null } },
      include: { defaultClient: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!device?.defaultClient) {
      return { error: 'No device with a default Jellyfin client is set up. Configure one under Devices first.' }
    }
    const server = await db.jellyfinServer.findUnique({ where: { userId: accountId } })
    if (!server) return { error: 'No Jellyfin server linked to this account.' }

    const apiToken = decrypt(server.apiToken)
    const customHeaders = server.customHeaders
      ? (() => { try { return JSON.parse(decrypt(server.customHeaders!)) as Record<string, string> } catch { return {} } })()
      : {}

    result = await attemptJellyfinPlay({
      tag: {
        id: tag.id,
        jellyfinItemId: tag.jellyfinItemId,
        jellyfinItemType: tag.jellyfinItemType,
        jellyfinItemTitle: tag.jellyfinItemTitle,
        resumePlayback: tag.resumePlayback,
        shuffle: tag.shuffle,
      },
      client: device.defaultClient,
      server,
      apiToken,
      customHeaders,
    })
  }

  // Log the dashboard trigger so it shows up in activity. deviceId is null
  // since no physical Jellybox was involved.
  await db.activityLog.create({
    data: {
      userId: accountId,
      deviceId: null,
      deviceName: 'Dashboard',
      tagId: tag.tagId,
      rfidTagId: tag.id,
      jellyfinItemTitle: tag.jellyfinItemTitle ?? tag.externalItemTitle ?? null,
      success: result.type === 'success',
      errorCode: result.type === 'failure' ? result.code : null,
    },
  })

  if (result.type === 'success') {
    return { success: true, content: result.content }
  }
  return { error: result.message }
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
