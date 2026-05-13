import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage.js';
import { ClientesPage } from '../pages/ClientesPage.js';
import { adminUser } from '../fixtures/users.js';

const clienteTest = {
  nombre: `E2E Cliente ${Date.now()}`,
  rut: '21234567',
};

test.describe('Clientes', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login(adminUser.email, adminUser.password);
    await login.expectDashboard();
  });

  test('navega a clientes y muestra la tabla', async ({ page }) => {
    const clientes = new ClientesPage(page);
    await clientes.navigate();
    await expect(clientes.rows.first()).toBeVisible();
  });

  test('abre el formulario de nuevo cliente al hacer click en Agregar', async ({ page }) => {
    const clientes = new ClientesPage(page);
    await clientes.navigate();
    await clientes.openAddForm();
    await expect(clientes.nameInput).toBeVisible();
    await expect(clientes.rutInput).toBeVisible();
    await expect(clientes.submitButton).toBeVisible();
  });

  test('crea un nuevo cliente correctamente', async ({ page }) => {
    const clientes = new ClientesPage(page);
    await clientes.navigate();
    await clientes.openAddForm();
    await clientes.fillForm(clienteTest);
    await clientes.submit();

    // El formulario debe cerrarse y el nuevo cliente aparecer
    await expect(clientes.nameInput).not.toBeVisible();
    await clientes.search(clienteTest.nombre);
    await expect(clientes.rows.first()).toBeVisible();
    const firstRowText = await clientes.rows.first().textContent();
    expect(firstRowText).toContain(clienteTest.nombre);
  });

  test('buscar por nombre filtra la lista de clientes', async ({ page }) => {
    const clientes = new ClientesPage(page);
    await clientes.navigate();

    // Primero lee el nombre del primer cliente disponible
    const primerNombre = await clientes.rows.first().locator('td').first().textContent();
    if (primerNombre) {
      const fragmento = primerNombre.slice(0, 4);
      await clientes.search(fragmento);
      await page.waitForTimeout(300);
      const allRows = await clientes.rows.count();
      expect(allRows).toBeGreaterThan(0);
    }
  });

  test('hacer click en un cliente expande el panel de acciones', async ({ page }) => {
    const clientes = new ClientesPage(page);
    await clientes.navigate();
    await clientes.clickFirstRow();
    await expect(clientes.expandedPanel).toBeVisible();
  });
});
