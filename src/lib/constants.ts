// ─── App ──────────────────────────────────────────────────────────────────────
export const APP_NAME = 'Jellybox'
export const APP_DESCRIPTION =
  'Link your Jellyfin server and assign RFID tags to your media library.'

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const PASSWORD_MIN_LENGTH = 8
export const VERIFICATION_TOKEN_EXPIRY_HOURS = 24
export const PASSWORD_RESET_TOKEN_EXPIRY_HOURS = 1

// ─── Device API Keys ──────────────────────────────────────────────────────────
export const DEVICE_API_KEY_PREFIX = 'jb_'
export const DEVICE_API_KEY_BYTES = 32

// ─── Rate Limiting ────────────────────────────────────────────────────────────
/** Maximum playback requests per device per window */
export const RATE_LIMIT_MAX_REQUESTS = 60
/** Sliding window duration in seconds */
export const RATE_LIMIT_WINDOW_SECONDS = 60

// ─── Jellyfin ─────────────────────────────────────────────────────────────────
/** Timeout in ms for Jellyfin API calls */
export const JELLYFIN_REQUEST_TIMEOUT_MS = 8_000
/** How many items to fetch per page when browsing the library */
export const JELLYFIN_LIBRARY_PAGE_SIZE = 50

// ─── Extensions ───────────────────────────────────────────────────────────────
/** Timeout in ms for HTTP calls to third-party extensions */
export const EXTENSION_REQUEST_TIMEOUT_MS = 8_000

// ─── Scan Debounce ────────────────────────────────────────────────────────────
/** Default grace period in seconds between successive plays from the same device */
export const DEFAULT_DEBOUNCE_SECONDS = 5

// ─── Webhook ──────────────────────────────────────────────────────────────────
/** Maximum total seconds the play endpoint will wait for a webhook retry before giving up */
export const WEBHOOK_MAX_WAIT_SECONDS = 55

// ─── Playback Error Codes ─────────────────────────────────────────────────────
export const PLAY_ERROR = {
  UNASSIGNED: 'UNASSIGNED',
  OFFLINE: 'OFFLINE',
  AUTH_ERROR: 'AUTH_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  OUTSIDE_HOURS: 'OUTSIDE_HOURS',
  NO_CLIENT: 'NO_CLIENT',
  UNKNOWN: 'UNKNOWN',
} as const

export type PlayErrorCode = (typeof PLAY_ERROR)[keyof typeof PLAY_ERROR]

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const ACTIVITY_LOG_PAGE_SIZE = 50
