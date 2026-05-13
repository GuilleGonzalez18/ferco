export class StockPage {
  constructor(page) {
    this.page = page;
    this.navButton = page.locator('#dashboard-nav-control-stock');
    this.searchField = page.locator('.control-stock-head .table-search-field');
    this.rows = page.locator('.control-stock-table tbody tr');
    this.expandedPanel = page.locator('.stock-inline-panel');
    this.cantidadInput = page.locator('.stock-cantidad input');
    this.addButton = page.getByRole('button', { name: 'Agregar stock' });
    this.removeButton = page.getByRole('button', { name: 'Quitar stock' });
    this.setButton = page.getByRole('button', { name: 'Fijar stock' });
    this.currentStockDisplay = page.locator('.stock-grande');
  }

  async navigate() {
    await this.navButton.click();
    await this.searchField.waitFor({ state: 'visible' });
  }

  /** Busca un producto por nombre y expande su fila */
  async selectProductByName(name) {
    await this.searchField.fill(name);
    await this.page.waitForTimeout(300);
    await this.rows.first().waitFor({ state: 'visible' });
    await this.rows.first().click();
    await this.expandedPanel.waitFor({ state: 'visible' });
  }

  /** Lee el stock actual del panel expandido */
  async getCurrentStock() {
    const text = await this.currentStockDisplay.textContent();
    return parseInt(text.trim(), 10);
  }

  /** Agrega cantidad al stock */
  async addStock(amount) {
    await this.cantidadInput.fill(String(amount));
    await this.addButton.click();
    await this.page.waitForTimeout(500);
  }

  /** Quita cantidad del stock */
  async removeStock(amount) {
    await this.cantidadInput.fill(String(amount));
    await this.removeButton.click();
    await this.page.waitForTimeout(500);
  }

  /** Fija el stock a un valor exacto */
  async setStock(amount) {
    await this.cantidadInput.fill(String(amount));
    await this.setButton.click();
    await this.page.waitForTimeout(500);
  }
}
