import type { Page } from '@playwright/test'

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard')
  }

  async gotoDevices() {
    await this.page.goto('/dashboard/devices')
  }

  async gotoTags() {
    await this.page.goto('/dashboard/tags')
  }

  async gotoJellyfin() {
    await this.page.goto('/dashboard/jellyfin')
  }

  async gotoAccount() {
    await this.page.goto('/dashboard/account')
  }

  async expectHeading(text: string) {
    await this.page.waitForSelector(`h1:has-text("${text}")`)
  }

  async clickNavItem(label: string) {
    await this.page.click(`nav a:has-text("${label}")`)
  }

  async signOut() {
    await this.page.click('[aria-label="Sign out"]')
    await this.page.waitForURL('/')
  }
}
