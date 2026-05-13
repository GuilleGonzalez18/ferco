export class HistorialPage {
  constructor(page) {
    this.page = page;
    this.navButton = page.locator('#dashboard-nav-ventas');
    this.toolbar = page.locator('.ventas-historial-toolbar');
    this.table = page.locator('.app-table');
    this.rows = page.locator('.app-table tbody tr');
    this.expandedPanel = page.locator('.venta-detalle-panel');
    this.cancelButton = page.locator('.venta-detalle-panel .cancel-btn');
    this.deleteButton = page.locator('.venta-detalle-panel .delete-btn');
    this.reprintButton = page.locator('.venta-detalle-panel .reprint-btn').first();
  }

  async navigate() {
    await this.navButton.click();
    await this.toolbar.waitFor({ state: 'visible' });
  }

  /** Hace click en la primera fila de la tabla para expandirla */
  async clickFirstRow() {
    await this.rows.first().waitFor({ state: 'visible' });
    await this.rows.first().click();
    await this.expandedPanel.waitFor({ state: 'visible' });
  }

  /** Escribe en el filtro de fecha "desde" */
  async setFechaDesde(value) {
    const input = this.page.locator('.ventas-fecha-filter input[type="date"]').first();
    await input.fill(value);
  }
}
