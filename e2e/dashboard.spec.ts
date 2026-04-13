import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/DashboardPage'

// Use pre-authenticated state from global setup
test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('Dashboard', () => {
  test('overview page loads with stats', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()
    await dashboard.expectHeading('Welcome back')
    await expect(page.locator('text=Jellyfin Server')).toBeVisible()
    await expect(page.locator('text=Devices')).toBeVisible()
    await expect(page.locator('text=Tags')).toBeVisible()
  })

  test('navigation works for all sections', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await dashboard.clickNavItem('Devices')
    await expect(page).toHaveURL('/dashboard/devices')

    await dashboard.clickNavItem('Tags')
    await expect(page).toHaveURL('/dashboard/tags')

    await dashboard.clickNavItem('Jellyfin')
    await expect(page).toHaveURL('/dashboard/jellyfin')

    await dashboard.clickNavItem('Account')
    await expect(page).toHaveURL('/dashboard/account')
  })

  test('devices page shows empty state', async ({ page }) => {
    await page.goto('/dashboard/devices')
    await expect(page.locator('h1')).toContainText('Devices')
  })

  test('tags page shows empty state or grid', async ({ page }) => {
    await page.goto('/dashboard/tags')
    await expect(page.locator('h1')).toContainText('RFID Tags')
  })

  test('account page shows profile form', async ({ page }) => {
    await page.goto('/dashboard/account')
    await expect(page.locator('h1')).toContainText('Account')
    await expect(page.locator('[name="name"]')).toBeVisible()
  })
})
