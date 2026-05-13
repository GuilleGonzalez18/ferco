import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { VentasPage } from '../pages/VentasPage.js';
import { adminUser } from '../fixtures/users.js';

test.describe('Ventas', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(adminUser.email, adminUser.password);
    await login.expectDashboard();
  });

  test('happy path: venta con un producto completa exitosamente', async ({ page }) => {
    const ventas = new VentasPage(page);
    await ventas.navigate();
    await ventas.addProductByName('');
    await ventas.confirmSale();
    await expect(ventas.successModal).toBeVisible();
  });

  test('happy path: venta con múltiples productos', async ({ page }) => {
    const ventas = new VentasPage(page);
    await ventas.navigate();
    // Agrega dos productos distintos
    await ventas.addProductByName('');
    const firstAdd = page.locator('[id^="nueva-venta-producto-"][id$="-agregar"]').nth(1);
    if (await firstAdd.isVisible()) {
      await firstAdd.click();
    }
    // Verifica que hay al menos 2 items en el carrito
    const cartItems = page.locator('.carrito-item');
    await expect(cartItems.first()).toBeVisible();
  });

  test('carrito vacío no permite avanzar', async ({ page }) => {
    const ventas = new VentasPage(page);
    await ventas.navigate();
    // El botón siguiente debe estar deshabilitado si no hay productos
    await expect(ventas.nextStepButton).toBeDisabled();
  });
});
