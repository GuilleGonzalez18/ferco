export class LoginPage {
  constructor(page) {
    this.page = page;
    this.emailInput = page.locator('#login-email');
    this.passwordInput = page.locator('#login-password');
    this.submitButton = page.getByRole('button', { name: 'Entrar' });
    this.errorMessage = page.locator('.error');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectDashboard() {
    await this.page.locator('.dashboard-sidebar').waitFor({ state: 'visible' });
  }

  async expectError() {
    await this.errorMessage.waitFor({ state: 'visible' });
  }
}
