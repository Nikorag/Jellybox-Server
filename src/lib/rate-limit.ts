import { db } from '@/lib/db'
import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS,
} from '@/lib/constants'

/**
 * Simple DB-backed sliding window rate limiter for device API keys.
 * Counts ActivityLog entries in the last RATE_LIMIT_WINDOW_SECONDS seconds for a given device.
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfterSeconds: number }`.
 */
export async function checkRateLimit(
  deviceId: string,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000,
  )

  const count = await db.activityLog.count({
    where: {
      deviceId,
      createdAt: { gte: windowStart },
    },
  })

  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: RATE_LIMIT_WINDOW_SECONDS }
  }

  return { allowed: true }
}
