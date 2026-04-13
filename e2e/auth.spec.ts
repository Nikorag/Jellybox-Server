import { test, expect } from '@playwright/test'
import { AuthPage } from './pages/AuthPage'

test.describe('Authentication', () => {
  test('landing page loads and shows sign in link', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('kids')
    await expect(page.locator('a:has-text("Sign in")')).toBeVisible()
    await expect(page.locator('a:has-text("Get started")')).toBeVisible()
  })

  test('sign in page loads', async ({ page }) => {
    await page.goto('/auth/signin')
    await expect(page.locator('h1')).toContainText('Welcome back')
    await expect(page.locator('[name="email"]')).toBeVisible()
    await expect(page.locator('[name="password"]')).toBeVisible()
  })

  test('sign in with invalid credentials shows error', async ({ page }) => {
    const auth = new AuthPage(page)
    await auth.signIn('nobody@nowhere.com', 'wrongpassword')
    await auth.expectSignInError('Invalid email or password')
  })

  test('sign in with valid credentials redirects to dashboard', async ({ page }) => {
    const auth = new AuthPage(page)
    await auth.signIn('e2e@example.com', 'testpassword')
    await auth.expectRedirectToDashboard()
  })

  test('protected route redirects unauthenticated user to sign in', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/auth/signin**')
    expect(page.url()).toContain('/auth/signin')
  })

  test('sign up page loads', async ({ page }) => {
    await page.goto('/auth/signup')
    await expect(page.locator('h1')).toContainText('Create account')
  })

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await expect(page.locator('h1')).toContainText('Forgot password')
  })
})
