import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import {
  DEVICE_API_KEY_PREFIX,
  DEVICE_API_KEY_BYTES,
} from '@/lib/constants'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV for GCM

function getEncryptionKey(): Buffer {
  const key = process.env.JELLYFIN_ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error(
      'JELLYFIN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).',
    )
  }
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: `iv:authTag:ciphertext` (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * Decrypt a string produced by `encrypt()`.
 * Returns the original plaintext.
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, ciphertextHex] = encryptedData.split(':')
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Invalid encrypted data format.')
  }
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

/** Hash a string with bcrypt (12 rounds). */
export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 12)
}

/** Compare a plaintext string against a bcrypt hash. */
export async function verifySecret(
  secret: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(secret, hash)
}

/**
 * Generate a new device API key.
 * Returns `{ rawKey, hash, prefix }`.
 * - `rawKey` is shown to the user exactly once.
 * - `hash` is stored in the database.
 * - `prefix` (first 8 chars after the `jb_` prefix) is stored for display.
 */
export async function generateDeviceApiKey(): Promise<{
  rawKey: string
  hash: string
  prefix: string
}> {
  const random = crypto.randomBytes(DEVICE_API_KEY_BYTES).toString('hex')
  const rawKey = `${DEVICE_API_KEY_PREFIX}${random}`
  const hash = await hashSecret(rawKey)
  // prefix = "jb_" + first 8 chars of the random portion = 11 chars total
  const prefix = rawKey.slice(0, DEVICE_API_KEY_PREFIX.length + 8)
  return { rawKey, hash, prefix }
}

/** Generate a cryptographically random token suitable for email verification / password reset. */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
