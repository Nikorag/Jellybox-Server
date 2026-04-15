'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function addPartnerAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorised' }

  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  if (!email) return { error: 'Email is required.' }
  if (email === session.user.email?.toLowerCase()) {
    return { error: 'You cannot add yourself as a partner.' }
  }

  const partnerUser = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  })
  if (!partnerUser) {
    return { error: 'No Jellybox account found with that email address.' }
  }

  const existing = await db.accountPartner.findUnique({
    where: {
      ownerId_partnerId: { ownerId: session.user.id, partnerId: partnerUser.id },
    },
  })
  if (existing) return { error: 'That user is already a partner on this account.' }

  await db.accountPartner.create({
    data: { ownerId: session.user.id, partnerId: partnerUser.id },
  })

  revalidatePath('/dashboard/partners')
  return {}
}

export async function removePartnerAction(partnerId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  await db.accountPartner.deleteMany({
    where: { ownerId: session.user.id, partnerId },
  })

  revalidatePath('/dashboard/partners')
}

/** Switch the active context to an owner account (or back to own). */
export async function switchContextAction(accountId: string | null): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  const cookieStore = await cookies()

  if (!accountId || accountId === session.user.id) {
    cookieStore.delete('jb_ctx')
  } else {
    // Validate the partner relationship still exists
    const partner = await db.accountPartner.findUnique({
      where: {
        ownerId_partnerId: { ownerId: accountId, partnerId: session.user.id },
      },
      select: { ownerId: true },
    })
    if (!partner) return

    cookieStore.set('jb_ctx', accountId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  redirect('/dashboard')
}

/** Leave an account you have partner access to. */
export async function leavePartnerAccountAction(ownerId: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return

  await db.accountPartner.deleteMany({
    where: { ownerId, partnerId: session.user.id },
  })

  // Clear context cookie if we were viewing that account
  const cookieStore = await cookies()
  const ctx = cookieStore.get('jb_ctx')?.value
  if (ctx === ownerId) cookieStore.delete('jb_ctx')

  revalidatePath('/dashboard/partners')
  redirect('/dashboard')
}
