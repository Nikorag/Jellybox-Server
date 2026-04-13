import type { Page } from '@playwright/test'

export class DevicesPage {
  constructor(private page: Page) {}

  async gotoPair() {
    await this.page.goto('/dashboard/devices/pair')
  }

  async pairDevice(name: string) {
    await this.gotoPair()
    await this.page.fill('[name="name"]', name)
    await this.page.click('[type="submit"]')
  }

  async expectApiKeyDisplayed() {
    // The API key display page shows a warning and a copy button
    await this.page.waitForSelector('text=Copy this key now')
  }

  async getDisplayedApiKey(): Promise<string> {
    return this.page.innerText('code')
  }
}
