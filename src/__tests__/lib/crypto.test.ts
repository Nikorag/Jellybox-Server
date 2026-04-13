import { encrypt, decrypt, hashSecret, verifySecret, generateDeviceApiKey, generateSecureToken } from '@/lib/crypto'
import { DEVICE_API_KEY_PREFIX } from '@/lib/constants'

// Set a valid 64-char hex key for tests
beforeAll(() => {
  process.env.JELLYFIN_ENCRYPTION_KEY = 'a'.repeat(64)
})

describe('encrypt / decrypt', () => {
  it('round-trips plaintext', () => {
    const plaintext = 'my-secret-token'
    const ciphertext = encrypt(plaintext)
    expect(ciphertext).not.toBe(plaintext)
    expect(decrypt(ciphertext)).toBe(plaintext)
  })

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const a = encrypt('same')
    const b = encrypt('same')
    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe('same')
    expect(decrypt(b)).toBe('same')
  })

  it('throws on tampered data', () => {
    const ct = encrypt('secret')
    expect(() => decrypt(ct.slice(0, -4) + 'xxxx')).toThrow()
  })
})

describe('hashSecret / verifySecret', () => {
  it('verifies a matching secret', async () => {
    const hash = await hashSecret('mypassword')
    await expect(verifySecret('mypassword', hash)).resolves.toBe(true)
  })

  it('rejects a wrong secret', async () => {
    const hash = await hashSecret('mypassword')
    await expect(verifySecret('wrongpassword', hash)).resolves.toBe(false)
  })
})

describe('generateDeviceApiKey', () => {
  it('returns rawKey, hash, and prefix', async () => {
    const { rawKey, hash, prefix } = await generateDeviceApiKey()
    expect(rawKey).toMatch(new RegExp(`^${DEVICE_API_KEY_PREFIX}`))
    expect(prefix).toBe(rawKey.slice(0, DEVICE_API_KEY_PREFIX.length + 8))
    await expect(verifySecret(rawKey, hash)).resolves.toBe(true)
  })

  it('generates unique keys each call', async () => {
    const a = await generateDeviceApiKey()
    const b = await generateDeviceApiKey()
    expect(a.rawKey).not.toBe(b.rawKey)
  })
})

describe('generateSecureToken', () => {
  it('returns a 64-char hex string', () => {
    const token = generateSecureToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]+$/)
  })
})
