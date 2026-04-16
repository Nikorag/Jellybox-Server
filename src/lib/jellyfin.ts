import { JELLYFIN_REQUEST_TIMEOUT_MS, JELLYFIN_LIBRARY_PAGE_SIZE } from '@/lib/constants'

export type JellyfinItemType = 'Movie' | 'Series' | 'Episode' | 'MusicAlbum' | 'Playlist'

export interface JellyfinSystemInfo {
  Id: string
  ServerName: string
  Version: string
}

export interface JellyfinAuthResult {
  AccessToken: string
  User: { Id: string; Name: string }
}

export interface JellyfinItem {
  Id: string
  Name: string
  Type: JellyfinItemType
  ProductionYear?: number
  ImageTags?: { Primary?: string }
  SeriesName?: string
  IndexNumber?: number
  ParentIndexNumber?: number
}

export interface JellyfinSession {
  Id: string
  DeviceId: string
  DeviceName: string
  Client: string
  UserId?: string
  UserName?: string
  NowPlayingItem?: { Name: string }
  LastActivityDate: string
  SupportsRemoteControl: boolean
}

export interface JellyfinLibraryResult {
  Items: JellyfinItem[]
  TotalRecordCount: number
}

/** Build a Jellyfin image URL for a given item and image tag. */
export function getJellyfinImageUrl(
  serverUrl: string,
  itemId: string,
  imageTag: string,
  size = 300,
): string {
  const base = serverUrl.replace(/\/$/, '')
  return `${base}/Items/${itemId}/Images/Primary?tag=${imageTag}&maxWidth=${size}&quality=90`
}

async function jellyfinFetch<T>(
  serverUrl: string,
  path: string,
  apiToken: string,
  options?: RequestInit,
  customHeaders?: Record<string, string>,
): Promise<T> {
  const base = serverUrl.replace(/\/$/, '')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), JELLYFIN_REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: {
        // Custom headers first — they are additive (e.g. Cloudflare Access tokens)
        ...(customHeaders ?? {}),
        'X-Emby-Authorization': `MediaBrowser Token="${apiToken}"`,
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new JellyfinApiError(res.status, `Jellyfin API error: ${res.status} ${res.statusText}`)
    }

    // 204 No Content (e.g. play commands) — nothing to parse
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T
    }

    return (await res.json()) as T
  } catch (err) {
    if (err instanceof JellyfinApiError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new JellyfinApiError(0, 'Request timed out — Jellyfin server may be unreachable.')
    }
    throw new JellyfinApiError(0, `Network error: ${(err as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }
}

export class JellyfinApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'JellyfinApiError'
  }

  get isUnreachable() {
    return this.statusCode === 0
  }

  get isAuthError() {
    return this.statusCode === 401 || this.statusCode === 403
  }
}

/** Authenticate with username/password to obtain an API token. */
export async function jellyfinAuthenticate(
  serverUrl: string,
  username: string,
  password: string,
  customHeaders?: Record<string, string>,
): Promise<JellyfinAuthResult> {
  const base = serverUrl.replace(/\/$/, '')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), JELLYFIN_REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${base}/Users/AuthenticateByName`, {
      method: 'POST',
      headers: {
        ...(customHeaders ?? {}),
        'X-Emby-Authorization':
          'MediaBrowser Client="Jellybox Server", Device="Jellybox Server", DeviceId="jellybox-server", Version="1.0.0"',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Username: username, Pw: password }),
      signal: controller.signal,
    })

    if (res.status === 401) {
      throw new JellyfinApiError(401, 'Invalid Jellyfin username or password.')
    }
    if (!res.ok) {
      throw new JellyfinApiError(res.status, `Jellyfin auth failed: ${res.statusText}`)
    }

    return (await res.json()) as JellyfinAuthResult
  } catch (err) {
    if (err instanceof JellyfinApiError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new JellyfinApiError(0, 'Request timed out — check the server URL.')
    }
    throw new JellyfinApiError(0, `Could not reach server: ${(err as Error).message}`)
  } finally {
    clearTimeout(timeout)
  }
}

/** Fetch basic server info to validate URL and retrieve server ID/name. */
export async function jellyfinGetSystemInfo(
  serverUrl: string,
  apiToken: string,
  customHeaders?: Record<string, string>,
): Promise<JellyfinSystemInfo> {
  return jellyfinFetch<JellyfinSystemInfo>(serverUrl, '/System/Info', apiToken, undefined, customHeaders)
}

/** Fetch active Jellyfin sessions (playback clients). */
export async function jellyfinGetSessions(
  serverUrl: string,
  apiToken: string,
  customHeaders?: Record<string, string>,
): Promise<JellyfinSession[]> {
  return jellyfinFetch<JellyfinSession[]>(serverUrl, '/Sessions', apiToken, undefined, customHeaders)
}

/** Browse the Jellyfin media library with optional search and type filter. */
export async function jellyfinBrowseLibrary(
  serverUrl: string,
  apiToken: string,
  opts: {
    search?: string
    types?: JellyfinItemType[]
    startIndex?: number
    limit?: number
  } = {},
  customHeaders?: Record<string, string>,
): Promise<JellyfinLibraryResult> {
  const params = new URLSearchParams({
    Recursive: 'true',
    Fields: 'ImageTags,ProductionYear',
    ImageTypeLimit: '1',
    EnableImageTypes: 'Primary',
    Limit: String(opts.limit ?? JELLYFIN_LIBRARY_PAGE_SIZE),
    StartIndex: String(opts.startIndex ?? 0),
    SortBy: 'SortName',
    SortOrder: 'Ascending',
  })

  if (opts.search) params.set('SearchTerm', opts.search)
  if (opts.types?.length) params.set('IncludeItemTypes', opts.types.join(','))

  return jellyfinFetch<JellyfinLibraryResult>(
    serverUrl,
    `/Items?${params.toString()}`,
    apiToken,
    undefined,
    customHeaders,
  )
}

/**
 * Pick a random episode from a series.
 * Returns null if the series has no episodes.
 */
export async function jellyfinGetRandomEpisode(
  serverUrl: string,
  apiToken: string,
  seriesId: string,
  customHeaders?: Record<string, string>,
): Promise<JellyfinItem | null> {
  const params = new URLSearchParams({
    ParentId: seriesId,
    IncludeItemTypes: 'Episode',
    Recursive: 'true',
    SortBy: 'Random',
    Limit: '1',
    Fields: 'ImageTags',
  })
  const result = await jellyfinFetch<JellyfinLibraryResult>(
    serverUrl,
    `/Items?${params}`,
    apiToken,
    undefined,
    customHeaders,
  )
  return result.Items[0] ?? null
}

/**
 * Get the next unplayed episode for a user in a series, sorted by season/episode order.
 * Falls back to a random episode if the user has watched everything or has no watch history.
 */
export async function jellyfinGetNextEpisode(
  serverUrl: string,
  apiToken: string,
  seriesId: string,
  userId: string,
  customHeaders?: Record<string, string>,
): Promise<JellyfinItem | null> {
  const params = new URLSearchParams({
    UserId: userId,
    IsPlayed: 'false',
    Limit: '1',
    SortBy: 'ParentIndexNumber,IndexNumber',
    SortOrder: 'Ascending',
    Fields: 'ImageTags',
  })
  const result = await jellyfinFetch<JellyfinLibraryResult>(
    serverUrl,
    `/Shows/${seriesId}/Episodes?${params}`,
    apiToken,
    undefined,
    customHeaders,
  )
  if (result.Items[0]) return result.Items[0]
  // All episodes watched — fall back to random
  return jellyfinGetRandomEpisode(serverUrl, apiToken, seriesId, customHeaders)
}

/** Trigger playback on a specific Jellyfin session. */
export async function jellyfinPlay(
  serverUrl: string,
  apiToken: string,
  sessionId: string,
  itemId: string,
  customHeaders?: Record<string, string>,
  playCommand: 'PlayNow' | 'PlayShuffle' = 'PlayNow',
): Promise<void> {
  const params = new URLSearchParams({
    PlayCommand: playCommand,
    ItemIds: itemId,
    MediaSourceId: itemId,
    StartPositionTicks: '0',
  })
  const path = `/Sessions/${sessionId}/Playing?${params}`
  console.log('[jellyfin] play request:', path)
  await jellyfinFetch<void>(serverUrl, path, apiToken, { method: 'POST' }, customHeaders)
}
