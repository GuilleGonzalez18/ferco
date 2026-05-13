import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { ProductosPage } from '../pages/ProductosPage.js';
import { adminUser } from '../fixtures/users.js';

test.describe('Productos', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(adminUser.email, adminUser.password);
    await login.expectDashboard();
  });

  test('lista de productos muestra al menos un item', async ({ page }) => {
    const productos = new ProductosPage(page);
    await productos.navigate();
    const rows = page.locator('.app-table tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('crear producto nuevo lo muestra en la lista', async ({ page }) => {
    const productos = new ProductosPage(page);
    const nombre = `Test Producto ${Date.now()}`;
    await productos.navigate();
    await productos.openAddForm();
    await productos.fillProductForm({ nombre, stock: '10', venta: '150' });
    await productos.submit();
    await productos.expectProductInTable(nombre);
  });

  test('guardar producto sin nombre muestra error de validación', async ({ page }) => {
    const productos = new ProductosPage(page);
    await productos.navigate();
    await productos.openAddForm();
    await productos.submit();
    await expect(productos.inputError).toBeVisible();
  });
});
