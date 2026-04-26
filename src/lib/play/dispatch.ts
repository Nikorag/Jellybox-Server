// Shared playback dispatch helpers used by both the device-driven /api/play
// route and the dashboard "Trigger" action. Each helper takes the resolved
// inputs (server, client, extension row, etc.) and returns a discriminated
// PlaySuccess | PlayFailure result. Error mapping back to PLAY_ERROR codes
// happens here so callers don't repeat it.

import {
  jellyfinGetSessions,
  jellyfinPlay,
  jellyfinGetRandomEpisode,
  jellyfinGetNextEpisode,
  JellyfinApiError,
} from '@/lib/jellyfin'
import {
  ExtensionApiError,
  play as extensionPlay,
} from '@/lib/extensions/client'
import { PLAY_ERROR } from '@/lib/constants'
import type { Extension } from '@prisma/client'

export type PlaySuccess = { type: 'success'; content: string | undefined }
export type PlayFailure = { type: 'failure'; code: string; message: string }

export async function attemptJellyfinPlay({
  client,
  server,
  apiToken,
  customHeaders,
  tag,
}: {
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
    let playCommand: 'PlayNow' | 'PlayShuffle' = 'PlayNow'

    if (tag.jellyfinItemType === 'SERIES') {
      const episode =
        tag.resumePlayback && liveSession.UserId
          ? await jellyfinGetNextEpisode(server.serverUrl, apiToken, tag.jellyfinItemId!, liveSession.UserId, customHeaders)
          : await jellyfinGetRandomEpisode(server.serverUrl, apiToken, tag.jellyfinItemId!, customHeaders)
      if (!episode) {
        return { type: 'failure', code: PLAY_ERROR.OFFLINE, message: 'No episodes found for this series.' }
      }
      playItemId = episode.Id
      playItemTitle = episode.Name
    } else if (tag.shuffle) {
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

export async function attemptExtensionPlay({
  extension,
  accountId,
  clientId,
  externalItemId,
  title,
  flags,
}: {
  extension: Extension
  accountId: string
  clientId: string | null
  externalItemId: string
  title?: string
  flags: { resumePlayback: boolean; shuffle: boolean }
}): Promise<PlaySuccess | PlayFailure> {
  try {
    const result = await extensionPlay(extension, accountId, externalItemId, clientId, flags)
    if (result.ok) {
      return { type: 'success', content: title }
    }
    return {
      type: 'failure',
      code: mapExtensionCode(result.code),
      message: result.message,
    }
  } catch (err) {
    const code = err instanceof ExtensionApiError && err.isAuthError
      ? PLAY_ERROR.AUTH_ERROR
      : PLAY_ERROR.OFFLINE
    return {
      type: 'failure',
      code,
      message: err instanceof Error ? err.message : 'Extension error.',
    }
  }
}

function mapExtensionCode(code: 'OFFLINE' | 'NO_CLIENT' | 'AUTH_ERROR' | 'UNKNOWN'): string {
  switch (code) {
    case 'OFFLINE':
      return PLAY_ERROR.OFFLINE
    case 'NO_CLIENT':
      return PLAY_ERROR.NO_CLIENT
    case 'AUTH_ERROR':
      return PLAY_ERROR.AUTH_ERROR
    default:
      return PLAY_ERROR.UNKNOWN
  }
}
