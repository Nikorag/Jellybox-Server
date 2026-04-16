'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { hashSecret, verifySecret } from '@/lib/crypto'
import { PASSWORD_MIN_LENGTH } from '@/lib/constants'

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(128),
})

export async function updateProfileAction(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const parsed = updateProfileSchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  })

  revalidatePath('/dashboard/account')
  return { success: true }
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
})

export async function changePasswordAction(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user?.passwordHash) {
    return { error: 'Cannot change password for OAuth accounts.' }
  }

  const valid = await verifySecret(parsed.data.currentPassword, user.passwordHash)
  if (!valid) {
    return { error: 'Current password is incorrect.' }
  }

  const newHash = await hashSecret(parsed.data.newPassword)
  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  })

  return { success: true }
}

export async function deleteAccountAction(): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  // Cascade deletes on User will remove all associated data
  await db.user.delete({ where: { id: session.user.id } })
  return {}
}

export async function clearActivityLogAction(): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  await db.activityLog.deleteMany({ where: { userId: session.user.id } })
  revalidatePath('/dashboard')
  return {}
}

const operatingHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  end: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
})

export async function saveOperatingHoursAction(
  data: z.infer<typeof operatingHoursSchema>,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const parsed = operatingHoursSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid input.' }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      operatingHoursEnabled: parsed.data.enabled,
      operatingHoursStart: parsed.data.start ?? null,
      operatingHoursEnd: parsed.data.end ?? null,
      operatingHoursTimezone: parsed.data.timezone ?? null,
    },
  })

  revalidatePath('/dashboard/account')
  return { success: true }
}

export async function saveDebounceAction(
  seconds: number,
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const clamped = Math.min(Math.max(Math.round(seconds), 0), 30)

  await db.user.update({
    where: { id: session.user.id },
    data: { scanDebounceSeconds: clamped },
  })

  revalidatePath('/dashboard/account')
  return { success: true }
}
