import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifySecret, decrypt } from '@/lib/crypto'
import { jellyfinGetSessions, jellyfinPlay, jellyfinGetRandomEpisode, jellyfinGetNextEpisode, JellyfinApiError } from '@/lib/jellyfin'
import { checkRateLimit } from '@/lib/rate-limit'
import { isWithinOperatingHours } from '@/lib/utils'
import { PLAY_ERROR, WEBHOOK_MAX_WAIT_SECONDS } from '@/lib/constants'

const playSchema = z.object({
  tagId: z.string().min(1, 'tagId is required'),
})

export async function POST(req: Request) {
  // ── 1. Extract device API key ────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  const rawKey = authHeader?.replace(/^Bearer\s+/i, '').trim()

  if (!rawKey) {
    return NextResponse.json(
      { error: 'Missing API key.', code: 'AUTH_ERROR' },
      { status: 401 },
    )
  }

  // ── 2. Parse & validate request body ─────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = playSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    )
  }

  const { tagId } = parsed.data

  // ── 3. Find matching device by comparing key hash ─────────────────────────
  const keyPrefix = rawKey.slice(0, 11) // "jb_" + 8 chars

  const candidates = await db.device.findMany({
    where: { apiKeyPrefix: keyPrefix },
    include: {
      user: {
        select: {
          id: true,
          operatingHoursEnabled: true,
          operatingHoursStart: true,
          operatingHoursEnd: true,
          operatingHoursTimezone: true,
          scanDebounceSeconds: true,
        },
      },
      defaultClient: true,
    },
  })

  let matchedDevice: (typeof candidates)[number] | null = null
  for (const device of candidates) {
    if (await verifySecret(rawKey, device.apiKeyHash)) {
      matchedDevice = device
      break
    }
  }

  if (!matchedDevice) {
    return NextResponse.json(
      { error: 'Invalid or revoked API key.', code: PLAY_ERROR.AUTH_ERROR },
      { status: 401 },
    )
  }

  // ── 4. Scan capture mode — intercept scan for tag registration ──────────────
  if (
    matchedDevice.scanModeToken &&
    matchedDevice.scanModeExpiresAt &&
    matchedDevice.scanModeExpiresAt > new Date()
  ) {
    await db.device.update({
      where: { id: matchedDevice.id },
      data: {
        pendingScanTagId: tagId,
        lastSeenAt: new Date(),
      },
    })
    return NextResponse.json({ captured: true, tagId })
  }

  // ── 5. Rate limit check ───────────────────────────────────────────────────
  const rateCheck = await checkRateLimit(matchedDevice.id)
  if (!rateCheck.allowed) {
    await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, null, false, PLAY_ERROR.RATE_LIMITED)
    return NextResponse.json(
      { error: 'Rate limit exceeded.', code: PLAY_ERROR.RATE_LIMITED, retryAfterSeconds: rateCheck.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } },
    )
  }

  // ── 6. Debounce check ─────────────────────────────────────────────────────
  const debounceSeconds = matchedDevice.user.scanDebounceSeconds
  if (debounceSeconds > 0 && matchedDevice.lastPlayedAt) {
    const elapsed = (Date.now() - matchedDevice.lastPlayedAt.getTime()) / 1000
    if (elapsed < debounceSeconds) {
      return NextResponse.json(
        {
          error: 'Too soon after last scan.',
          code: PLAY_ERROR.RATE_LIMITED,
          retryAfterSeconds: Math.ceil(debounceSeconds - elapsed),
        },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(debounceSeconds - elapsed)) } },
      )
    }
  }

  // ── 7. Operating hours check ──────────────────────────────────────────────
  const { operatingHoursEnabled, operatingHoursStart, operatingHoursEnd, operatingHoursTimezone } = matchedDevice.user
  if (operatingHoursEnabled && operatingHoursStart && operatingHoursEnd) {
    const tz = operatingHoursTimezone ?? 'UTC'
    const localTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())

    if (!isWithinOperatingHours(localTime, operatingHoursStart, operatingHoursEnd)) {
      await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, null, false, PLAY_ERROR.OUTSIDE_HOURS)
      return NextResponse.json(
        { error: 'Outside operating hours.', code: PLAY_ERROR.OUTSIDE_HOURS },
        { status: 403 },
      )
    }
  }

  // ── 8. Update device last seen + firmware if provided ─────────────────────
  const firmwareVersion = req.headers.get('X-Firmware-Version') ?? undefined
  await db.device.update({
    where: { id: matchedDevice.id },
    data: {
      lastSeenAt: new Date(),
      ...(firmwareVersion && { firmwareVersion }),
    },
  })

  // ── 9. Look up RFID tag ───────────────────────────────────────────────────
  const tag = await db.rfidTag.findFirst({
    where: { tagId, userId: matchedDevice.user.id },
    select: {
      id: true,
      jellyfinItemId: true,
      jellyfinItemType: true,
      jellyfinItemTitle: true,
      resumePlayback: true,
      shuffle: true,
    },
  })

  if (!tag?.jellyfinItemId) {
    await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, null, false, PLAY_ERROR.UNASSIGNED)
    return NextResponse.json(
      { error: 'Tag not found or has no content assigned.', code: PLAY_ERROR.UNASSIGNED },
      { status: 404 },
    )
  }

  // ── 10. Determine playback client ──────────────────────────────────────────
  const client = matchedDevice.defaultClient
  if (!client) {
    await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, false, PLAY_ERROR.NO_CLIENT)
    return NextResponse.json(
      { error: 'No default playback client configured for this device.', code: PLAY_ERROR.NO_CLIENT },
      { status: 422 },
    )
  }

  // ── 11. Get Jellyfin server + find live session ────────────────────────────
  const server = await db.jellyfinServer.findUnique({
    where: { userId: matchedDevice.user.id },
  })

  if (!server) {
    await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, false, PLAY_ERROR.OFFLINE)
    return NextResponse.json(
      { error: 'No Jellyfin server linked to this account.', code: PLAY_ERROR.OFFLINE },
      { status: 503 },
    )
  }

  const apiToken = decrypt(server.apiToken)
  const customHeaders = server.customHeaders
    ? (() => { try { return JSON.parse(decrypt(server.customHeaders!)) as Record<string, string> } catch { return {} } })()
    : {}

  // ── 12. Attempt playback (with optional webhook retry) ────────────────────
  const result = await attemptPlay({
    deviceId: matchedDevice.id,
    userId: matchedDevice.user.id,
    deviceName: matchedDevice.name,
    tagId,
    tag,
    client,
    server,
    apiToken,
    customHeaders,
  })

  const webhookContext = {
    deviceName: matchedDevice.name,
    tagLabel: tag.jellyfinItemTitle ?? tagId,
  }

  if (result.type === 'success') {
    // Record lastPlayedAt for debounce
    await db.device.update({
      where: { id: matchedDevice.id },
      data: { lastPlayedAt: new Date() },
    })
    await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, true, null)
    // Fire TAG_SCANNED webhooks (best-effort, no retry)
    void fireWebhooks(matchedDevice.user.id, 'TAG_SCANNED', {
      ...webhookContext,
      contentTitle: result.content,
    })
    return NextResponse.json({ success: true, content: result.content })
  }

  // Play failed — check for JELLYFIN_OFFLINE webhooks and retry once
  if (result.code === PLAY_ERROR.OFFLINE) {
    const offlineWebhooks = await db.webhook.findMany({
      where: { userId: matchedDevice.user.id, event: 'JELLYFIN_OFFLINE' },
    })

    if (offlineWebhooks.length > 0) {
      // Fire all JELLYFIN_OFFLINE webhooks concurrently (best-effort, no body for backward compat)
      await Promise.allSettled(
        offlineWebhooks.map((w) =>
          fetch(w.url, { method: 'POST', signal: AbortSignal.timeout(5_000) }).catch(() => null),
        ),
      )

      // Wait the shortest configured retry delay (capped to avoid Vercel timeout)
      const waitSeconds = Math.min(
        Math.min(...offlineWebhooks.map((w) => w.retryDelaySeconds)),
        WEBHOOK_MAX_WAIT_SECONDS,
      )
      await new Promise((r) => setTimeout(r, waitSeconds * 1000))

      // Retry play once
      const retry = await attemptPlay({
        deviceId: matchedDevice.id,
        userId: matchedDevice.user.id,
        deviceName: matchedDevice.name,
        tagId,
        tag,
        client,
        server,
        apiToken,
        customHeaders,
      })

      if (retry.type === 'success') {
        await db.device.update({
          where: { id: matchedDevice.id },
          data: { lastPlayedAt: new Date() },
        })
        await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, true, null)
        void fireWebhooks(matchedDevice.user.id, 'TAG_SCANNED', {
          ...webhookContext,
          contentTitle: retry.content,
        })
        return NextResponse.json({ success: true, content: retry.content })
      }

      await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, false, retry.code)
      void fireWebhooks(matchedDevice.user.id, 'PLAYBACK_FAILED', {
        ...webhookContext,
        errorCode: retry.code,
      })
      return NextResponse.json(
        { error: retry.message, code: retry.code },
        { status: 503 },
      )
    }
  }

  await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, false, result.code)
  void fireWebhooks(matchedDevice.user.id, 'PLAYBACK_FAILED', {
    ...webhookContext,
    errorCode: result.code,
  })
  return NextResponse.json(
    { error: result.message, code: result.code },
    { status: 503 },
  )
}

// ── attemptPlay ───────────────────────────────────────────────────────────────

type PlaySuccess = { type: 'success'; content: string | undefined }
type PlayFailure = { type: 'failure'; code: string; message: string }

async function attemptPlay({
  client,
  server,
  apiToken,
  customHeaders,
  tag,
}: {
  deviceId: string
  userId: string
  deviceName: string
  tagId: string
  tag: {
    id: string
    jellyfinItemId: string | null
    jellyfinItemType: string | null
    jellyfinItemTitle: string | null
    resumePlayback: boolean
    shuffle: boolean
  }
  client: { jellyfinDeviceId: string }
  server: { serverUrl: string }
  apiToken: string
  customHeaders: Record<string, string>
}): Promise<PlaySuccess | PlayFailure> {
  try {
    const sessions = await jellyfinGetSessions(server.serverUrl, apiToken, customHeaders)

    const liveSession = sessions.find(
      (s) => s.DeviceId === client.jellyfinDeviceId && s.SupportsRemoteControl !== false,
    )

    if (!liveSession) {
      return { type: 'failure', code: PLAY_ERROR.OFFLINE, message: 'Playback client is not active.' }
    }

    let playItemId = tag.jellyfinItemId!
    let playItemTitle = tag.jellyfinItemTitle ?? undefined
    // Default play command; overridden to PlayShuffle for shuffle-enabled non-series items
    let playCommand: 'PlayNow' | 'PlayShuffle' = 'PlayNow'

    if (tag.jellyfinItemType === 'SERIES') {
      if (tag.resumePlayback && liveSession.UserId) {
        const episode = await jellyfinGetNextEpisode(
          server.serverUrl, apiToken, tag.jellyfinItemId!, liveSession.UserId, customHeaders,
        )
        if (!episode) {
          return { type: 'failure', code: PLAY_ERROR.OFFLINE, message: 'No episodes found for this series.' }
        }
        playItemId = episode.Id
        playItemTitle = episode.Name
      } else {
        // Default: random episode (also used as fallback when no UserId available)
        const episode = await jellyfinGetRandomEpisode(server.serverUrl, apiToken, tag.jellyfinItemId!, customHeaders)
        if (!episode) {
          return { type: 'failure', code: PLAY_ERROR.OFFLINE, message: 'No episodes found for this series.' }
        }
        playItemId = episode.Id
        playItemTitle = episode.Name
      }
    } else if (tag.shuffle) {
      // Albums and playlists: use Jellyfin's native shuffle command
      playCommand = 'PlayShuffle'
    }

    await jellyfinPlay(server.serverUrl, apiToken, liveSession.Id, playItemId, customHeaders, playCommand)
    return { type: 'success', content: playItemTitle }
  } catch (err) {
    const code = err instanceof JellyfinApiError && err.isAuthError
      ? PLAY_ERROR.AUTH_ERROR
      : PLAY_ERROR.OFFLINE
    return { type: 'failure', code, message: err instanceof Error ? err.message : 'Jellyfin error.' }
  }
}

// ── fireWebhooks ──────────────────────────────────────────────────────────────

async function fireWebhooks(
  userId: string,
  event: 'TAG_SCANNED' | 'PLAYBACK_FAILED',
  context: Record<string, string | undefined>,
): Promise<void> {
  const webhooks = await db.webhook.findMany({ where: { userId, event } })
  if (webhooks.length === 0) return

  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), ...context })

  await Promise.allSettled(
    webhooks.map((w) =>
      fetch(w.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(5_000),
      }).catch(() => null),
    ),
  )
}

// ── logActivity ───────────────────────────────────────────────────────────────

async function logActivity(
  deviceId: string,
  userId: string,
  deviceName: string,
  tagId: string,
  tag: { id: string; jellyfinItemTitle: string | null } | null,
  success: boolean,
  errorCode: string | null,
) {
  await db.activityLog.create({
    data: {
      userId,
      deviceId,
      deviceName,
      tagId,
      rfidTagId: tag?.id ?? null,
      jellyfinItemTitle: tag?.jellyfinItemTitle ?? null,
      success,
      errorCode,
    },
  })
}
