export class ProductosPage {
  constructor(page) {
    this.page = page;
    this.navButton = page.locator('#dashboard-nav-productos');
    this.addButton = page.getByRole('button', { name: 'Agregar producto' });
    this.searchField = page.locator('.table-search-field');
    this.nameInput = page.locator('input[name="nombre"]');
    this.stockInput = page.locator('input[name="stock"]');
    this.ventaInput = page.locator('input[name="venta"]');
    this.empaqueSelect = page.locator('select[name="empaqueId"]');
    this.ivaSelect = page.locator('select[name="ivaId"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.inputError = page.locator('.input-error');
    this.editButton = page.locator('.edit-btn').first();
  }

  async navigate() {
    await this.navButton.click();
    await this.addButton.waitFor({ state: 'visible' });
  }

  async openAddForm() {
    await this.addButton.click();
    await this.nameInput.waitFor({ state: 'visible' });
  }

  async fillProductForm({ nombre, stock, venta }) {
    await this.nameInput.fill(nombre);
    await this.stockInput.fill(stock);
    await this.ventaInput.fill(venta);
    // Select first available options if selects are present
    const empaqueOptions = await this.empaqueSelect.locator('option').count();
    if (empaqueOptions > 1) {
      await this.empaqueSelect.selectOption({ index: 1 });
    }
    const ivaOptions = await this.ivaSelect.locator('option').count();
    if (ivaOptions > 1) {
      await this.ivaSelect.selectOption({ index: 1 });
    }
  }

  async submit() {
    await this.submitButton.click();
  }

  async searchProduct(name) {
    await this.searchField.fill(name);
    await this.page.waitForTimeout(300);
  }

  async expectProductInTable(name) {
    await this.page.getByRole('cell', { name }).waitFor({ state: 'visible' });
  }
}
