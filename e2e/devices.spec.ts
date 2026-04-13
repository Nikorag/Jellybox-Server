import { test, expect } from '@playwright/test'
import { DevicesPage } from './pages/DevicesPage'

test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Device Management', () => {
  test('pair device flow shows API key', async ({ page }) => {
    const devices = new DevicesPage(page)
    await devices.pairDevice('E2E Test Box')
    await devices.expectApiKeyDisplayed()

    // API key should start with jb_ prefix
    const key = await devices.getDisplayedApiKey()
    expect(key).toMatch(/^jb_/)
  })

  test('pair device requires a name', async ({ page }) => {
    await page.goto('/dashboard/devices/pair')
    await page.click('[type="submit"]')
    // Browser native validation should prevent submission
    const nameInput = page.locator('[name="name"]')
    await expect(nameInput).toBeVisible()
  })

  test('devices page shows pair button', async ({ page }) => {
    await page.goto('/dashboard/devices')
    await expect(page.locator('a:has-text("Pair Device")')).toBeVisible()
  })
})
