/**
 * Env-driven auth flags. Safe to import from both server and edge contexts —
 * only reads `process.env`.
 */

function truthy(value: string | undefined): boolean {
  if (!value) return false
  const normalised = value.trim().toLowerCase()
  return normalised === '1' || normalised === 'true' || normalised === 'yes'
}

export interface OidcConfig {
  enabled: boolean
  name: string
}

export interface AuthProviderFlags {
  google: boolean
  oidc: OidcConfig
  signupEnabled: boolean
}

export function getAuthProviderFlags(): AuthProviderFlags {
  const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
  const googleDisabled = truthy(process.env.AUTH_DISABLE_GOOGLE)

  const oidcConfigured = Boolean(
    process.env.AUTH_OIDC_ISSUER &&
      process.env.AUTH_OIDC_ID &&
      process.env.AUTH_OIDC_SECRET,
  )

  return {
    google: googleConfigured && !googleDisabled,
    oidc: {
      enabled: oidcConfigured,
      name: process.env.AUTH_OIDC_NAME?.trim() || 'SSO',
    },
    signupEnabled: !truthy(process.env.AUTH_DISABLE_SIGNUP),
  }
}

export function publicPagesDisabled(): boolean {
  return truthy(process.env.DISABLE_PUBLIC_PAGES)
}

/**
 * Whether the given email is configured as an extensions admin.
 * Reads `ADMINS` (comma-separated list of emails). Compares case-insensitively.
 * Defaults to closed: empty/unset means *no one* is admin.
 */
export function isExtensionsAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const raw = process.env.ADMINS
  if (!raw) return false
  const normalised = email.trim().toLowerCase()
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalised)
}
