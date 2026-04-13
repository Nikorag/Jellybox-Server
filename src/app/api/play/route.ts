import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifySecret, decrypt } from '@/lib/crypto'
import { jellyfinGetSessions, jellyfinPlay, jellyfinGetRandomEpisode, JellyfinApiError } from '@/lib/jellyfin'
import { checkRateLimit } from '@/lib/rate-limit'
import { PLAY_ERROR } from '@/lib/constants'

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
  // Fetch a limited set of devices that share the key prefix for efficiency
  const keyPrefix = rawKey.slice(0, 11) // "jb_" + 8 chars

  const candidates = await db.device.findMany({
    where: { apiKeyPrefix: keyPrefix },
    include: {
      user: { select: { id: true } },
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

  // ── 6. Update device last seen + firmware if provided ─────────────────────
  const firmwareVersion = req.headers.get('X-Firmware-Version') ?? undefined
  await db.device.update({
    where: { id: matchedDevice.id },
    data: {
      lastSeenAt: new Date(),
      ...(firmwareVersion && { firmwareVersion }),
    },
  })

  // ── 6. Look up RFID tag ───────────────────────────────────────────────────
  const tag = await db.rfidTag.findFirst({
    where: { tagId, userId: matchedDevice.user.id },
  })

  if (!tag?.jellyfinItemId) {
    await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, null, false, PLAY_ERROR.UNASSIGNED)
    return NextResponse.json(
      { error: 'Tag not found or has no content assigned.', code: PLAY_ERROR.UNASSIGNED },
      { status: 404 },
    )
  }

  // ── 7. Determine playback client ──────────────────────────────────────────
  const client = matchedDevice.defaultClient
  if (!client) {
    await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, false, PLAY_ERROR.NO_CLIENT)
    return NextResponse.json(
      { error: 'No default playback client configured for this device.', code: PLAY_ERROR.NO_CLIENT },
      { status: 422 },
    )
  }

  // ── 8. Get Jellyfin server + find live session ────────────────────────────
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

  try {
    const apiToken = decrypt(server.apiToken)
    const sessions = await jellyfinGetSessions(server.serverUrl, apiToken)

    // Resolve live session by matching DeviceId
    // SupportsRemoteControl may be absent for some clients — don't exclude on undefined
    console.log('[play] looking for DeviceId:', client.jellyfinDeviceId)
    console.log('[play] sessions from Jellyfin:', sessions.map((s) => ({
      DeviceId: s.DeviceId,
      DeviceName: s.DeviceName,
      Client: s.Client,
      SupportsRemoteControl: s.SupportsRemoteControl,
    })))
    const liveSession = sessions.find(
      (s) => s.DeviceId === client.jellyfinDeviceId && s.SupportsRemoteControl !== false,
    )

    if (!liveSession) {
      await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, false, PLAY_ERROR.OFFLINE)
      return NextResponse.json(
        { error: 'Playback client is not active.', code: PLAY_ERROR.OFFLINE },
        { status: 503 },
      )
    }

    // ── 9. Resolve playable item (series → random episode) ───────────────
    let playItemId = tag.jellyfinItemId
    let playItemTitle = tag.jellyfinItemTitle ?? undefined

    if (tag.jellyfinItemType === 'SERIES') {
      const episode = await jellyfinGetRandomEpisode(server.serverUrl, apiToken, tag.jellyfinItemId)
      if (!episode) {
        await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, false, PLAY_ERROR.OFFLINE)
        return NextResponse.json(
          { error: 'No episodes found for this series.', code: PLAY_ERROR.OFFLINE },
          { status: 503 },
        )
      }
      playItemId = episode.Id
      playItemTitle = episode.Name
    }

    // ── 10. Trigger playback ──────────────────────────────────────────────
    console.log('[play] triggering playback', {
      sessionId: liveSession.Id,
      itemId: playItemId,
      itemTitle: playItemTitle,
      seriesId: tag.jellyfinItemType === 'SERIES' ? tag.jellyfinItemId : undefined,
    })
    await jellyfinPlay(server.serverUrl, apiToken, liveSession.Id, playItemId)

    await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, true, null)

    return NextResponse.json({ success: true, content: playItemTitle ?? tag.jellyfinItemTitle })
  } catch (err) {
    const code = err instanceof JellyfinApiError && err.isAuthError
      ? PLAY_ERROR.AUTH_ERROR
      : PLAY_ERROR.OFFLINE

    await logActivity(matchedDevice.id, matchedDevice.user.id, matchedDevice.name, tagId, tag, false, code)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Jellyfin error.', code },
      { status: 503 },
    )
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
