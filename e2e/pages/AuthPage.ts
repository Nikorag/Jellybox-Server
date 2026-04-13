import type { Page } from '@playwright/test'

export class AuthPage {
  constructor(private page: Page) {}

  async gotoSignIn() {
    await this.page.goto('/auth/signin')
  }

  async gotoSignUp() {
    await this.page.goto('/auth/signup')
  }

  async signIn(email: string, password: string) {
    await this.gotoSignIn()
    await this.page.fill('[name="email"]', email)
    await this.page.fill('[name="password"]', password)
    await this.page.click('[type="submit"]')
  }

  async signUp(name: string, email: string, password: string) {
    await this.gotoSignUp()
    await this.page.fill('[name="name"]', name)
    await this.page.fill('[name="email"]', email)
    await this.page.fill('[name="password"]', password)
    await this.page.click('[type="submit"]')
  }

  async expectRedirectToDashboard() {
    await this.page.waitForURL('**/dashboard')
  }

  async expectSignInError(message: string) {
    await this.page.waitForSelector(`text=${message}`)
  }
}
