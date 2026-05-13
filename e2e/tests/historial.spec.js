import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { HistorialPage } from '../pages/HistorialPage.js';
import { adminUser } from '../fixtures/users.js';

test.describe('Historial de ventas', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(adminUser.email, adminUser.password);
    await login.expectDashboard();
  });

  test('navega al historial y muestra al menos una venta', async ({ page }) => {
    const historial = new HistorialPage(page);
    await historial.navigate();
    await expect(historial.table).toBeVisible();
    await expect(historial.rows.first()).toBeVisible();
  });

  test('hacer click en una venta expande el panel de detalle', async ({ page }) => {
    const historial = new HistorialPage(page);
    await historial.navigate();
    await historial.clickFirstRow();
    await expect(historial.expandedPanel).toBeVisible();
  });

  test('el panel de detalle contiene botones de acción', async ({ page }) => {
    const historial = new HistorialPage(page);
    await historial.navigate();
    await historial.clickFirstRow();
    // Al menos debe verse el botón de reimprimir
    await expect(historial.reprintButton).toBeVisible();
  });

  test('hacer click nuevamente en la misma fila cierra el panel', async ({ page }) => {
    const historial = new HistorialPage(page);
    await historial.navigate();
    await historial.clickFirstRow();
    await expect(historial.expandedPanel).toBeVisible();
    // Segundo click colapsa
    await historial.rows.first().click();
    await expect(historial.expandedPanel).not.toBeVisible();
  });
});
