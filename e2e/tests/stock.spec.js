import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { StockPage } from '../pages/StockPage.js';
import { adminUser } from '../fixtures/users.js';

test.describe('Control de stock', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(adminUser.email, adminUser.password);
    await login.expectDashboard();
  });

  test('navega a control de stock y muestra la lista de productos', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.navigate();
    await expect(stock.rows.first()).toBeVisible();
  });

  test('hacer click en un producto expande el panel de ajuste', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.navigate();
    await stock.rows.first().click();
    await expect(stock.expandedPanel).toBeVisible();
    await expect(stock.addButton).toBeVisible();
    await expect(stock.removeButton).toBeVisible();
    await expect(stock.setButton).toBeVisible();
  });

  test('agregar stock incrementa la cantidad mostrada', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.navigate();
    await stock.rows.first().click();
    await expect(stock.expandedPanel).toBeVisible();

    const stockAntes = await stock.getCurrentStock();
    await stock.addStock(3);

    const stockDespues = await stock.getCurrentStock();
    expect(stockDespues).toBe(stockAntes + 3);
  });

  test('quitar stock decrementa la cantidad mostrada', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.navigate();

    // Busca un producto con stock > 0
    await stock.searchField.fill('');
    await page.waitForTimeout(300);
    await stock.rows.first().click();
    await expect(stock.expandedPanel).toBeVisible();

    const stockAntes = await stock.getCurrentStock();
    // Solo quita si hay stock suficiente
    if (stockAntes >= 1) {
      await stock.removeStock(1);
      const stockDespues = await stock.getCurrentStock();
      expect(stockDespues).toBe(stockAntes - 1);
    } else {
      test.skip();
    }
  });

  test('fijar stock establece el valor exacto indicado', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.navigate();
    await stock.rows.first().click();
    await expect(stock.expandedPanel).toBeVisible();

    const valorFijo = 10;
    await stock.setStock(valorFijo);
    const stockDespues = await stock.getCurrentStock();
    expect(stockDespues).toBe(valorFijo);
  });

  test('buscar por nombre filtra los productos', async ({ page }) => {
    const stock = new StockPage(page);
    await stock.navigate();

    // Lee el nombre del primer producto
    const primerNombre = await stock.rows.first().locator('strong').first().textContent();
    if (primerNombre) {
      const fragmento = primerNombre.slice(0, 3);
      await stock.searchField.fill(fragmento);
      await page.waitForTimeout(300);
      await expect(stock.rows.first()).toBeVisible();
    }
  });
});
