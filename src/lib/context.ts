import { cookies } from 'next/headers'
import { db } from './db'

const CTX_COOKIE = 'jb_ctx'

/**
 * Returns the account ID whose data should be read/written for this request.
 *
 * - No cookie → own account (userId)
 * - Cookie set → validates an AccountPartner row exists (ownerId=cookie, partnerId=userId)
 *   and returns the ownerId. Falls back to userId if the relationship no longer exists.
 */
export async function getActiveAccountId(userId: string): Promise<string> {
  const cookieStore = await cookies()
  const ctx = cookieStore.get(CTX_COOKIE)?.value

  if (!ctx || ctx === userId) return userId

  const partner = await db.accountPartner.findUnique({
    where: { ownerId_partnerId: { ownerId: ctx, partnerId: userId } },
    select: { ownerId: true },
  })

  return partner?.ownerId ?? userId
}

/** True when the user is operating on their own account. */
export async function isOwnContext(userId: string): Promise<boolean> {
  return (await getActiveAccountId(userId)) === userId
}
