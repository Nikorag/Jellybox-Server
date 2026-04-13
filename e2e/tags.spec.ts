import { test, expect } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('RFID Tag Management', () => {
  test('tags page loads', async ({ page }) => {
    await page.goto('/dashboard/tags')
    await expect(page.locator('h1')).toContainText('RFID Tags')
    await expect(page.locator('a:has-text("Register Tag")')).toBeVisible()
  })

  test('register tag page loads', async ({ page }) => {
    await page.goto('/dashboard/tags/new')
    await expect(page.locator('h1')).toContainText('Register Tag')
    await expect(page.locator('[name="tagId"]')).toBeVisible()
    await expect(page.locator('[name="label"]')).toBeVisible()
  })

  test('register tag with missing fields shows validation', async ({ page }) => {
    await page.goto('/dashboard/tags/new')
    await page.click('[type="submit"]')
    // Browser validation should prevent submission
    await expect(page.locator('[name="tagId"]')).toBeVisible()
  })

  test('register a new tag successfully', async ({ page }) => {
    await page.goto('/dashboard/tags/new')
    // Use a unique tag ID to avoid conflicts
    const uniqueTagId = `TEST${Date.now()}`
    await page.fill('[name="tagId"]', uniqueTagId)
    await page.fill('[name="label"]', 'E2E Test Tag')
    await page.click('[type="submit"]')
    // Should redirect to tags list
    await page.waitForURL('**/dashboard/tags')
    await expect(page.locator(`text=E2E Test Tag`)).toBeVisible()
  })
})
