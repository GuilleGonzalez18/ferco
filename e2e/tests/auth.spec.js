import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { adminUser, invalidUser } from '../fixtures/users.js';

test.describe('Autenticación', () => {
  test('login exitoso redirige al dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(adminUser.email, adminUser.password);
    await login.expectDashboard();
  });

  test('login con credenciales inválidas muestra error', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(invalidUser.email, invalidUser.password);
    await login.expectError();
  });

  test('login con campos vacíos no avanza', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await page.getByRole('button', { name: 'Entrar' }).click();
    // Debe permanecer en la página de login (no hay dashboard visible)
    await expect(page.locator('.dashboard-sidebar')).not.toBeVisible();
  });
});
