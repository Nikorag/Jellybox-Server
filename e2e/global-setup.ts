import { chromium, type FullConfig } from '@playwright/test'
import bcrypt from 'bcryptjs'

// This setup file seeds a test user and stores auth state for reuse across tests.
// It requires a running local database.

async function globalSetup(_config: FullConfig) {
  // Only seed if DATABASE_URL is configured (skip in CI if not set)
  if (!process.env.DATABASE_URL) {
    console.warn('[e2e] DATABASE_URL not set — skipping global setup seed.')
    return
  }

  // Dynamic import to avoid issues if Prisma isn't generated yet
  const { PrismaClient } = await import('@prisma/client')
  const db = new PrismaClient()

  try {
    const passwordHash = await bcrypt.hash('testpassword', 12)
    await db.user.upsert({
      where: { email: 'e2e@example.com' },
      update: { passwordHash, emailVerified: new Date() },
      create: {
        email: 'e2e@example.com',
        name: 'E2E User',
        emailVerified: new Date(),
        passwordHash,
      },
    })
  } finally {
    await db.$disconnect()
  }

  // Pre-authenticate and save session state
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto(`${process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'}/auth/signin`)
  await page.fill('[name="email"]', 'e2e@example.com')
  await page.fill('[name="password"]', 'testpassword')
  await page.click('[type="submit"]')
  await page.waitForURL('**/dashboard')

  await page.context().storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()
}

export default globalSetup
