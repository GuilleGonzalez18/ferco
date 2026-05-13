export class ClientesPage {
  constructor(page) {
    this.page = page;
    this.navButton = page.locator('#dashboard-nav-clientes');
    this.searchField = page.locator('.buscar-cliente');
    this.addButton = page.locator('button[title="Agregar cliente"]');
    this.rows = page.locator('.app-table tbody tr');
    this.expandedPanel = page.locator('.acciones-cliente-panel');
    this.editButton = page.locator('.acciones-cliente-panel .edit-btn');
    // Formulario (panel lateral) — selectores dentro del side-panel para evitar ambigüedad
    this.sidePanel = page.locator('.side-panel-overlay.open');
    this.nameInput = page.locator('.side-panel-overlay.open input[name="nombre"]');
    this.rutInput = page.locator('.side-panel-overlay.open input[name="rut"]');
    this.submitButton = page.locator('.side-panel-overlay.open .cliente-form button[type="submit"]');
    this.cancelFormButton = page.locator('.side-panel-overlay.open .cliente-form-actions button[type="button"]');
  }

  async navigate() {
    await this.navButton.click();
    await this.searchField.waitFor({ state: 'visible' });
  }

  /** Abre el formulario de nuevo cliente */
  async openAddForm() {
    await this.addButton.click();
    // Espera que el panel lateral tenga la clase 'open' antes de buscar inputs
    await this.sidePanel.waitFor({ state: 'visible' });
    await this.nameInput.waitFor({ state: 'visible' });
  }

  /** Rellena el formulario mínimo (nombre + rut) */
  async fillForm({ nombre, rut }) {
    await this.nameInput.fill(nombre);
    if (rut) await this.rutInput.fill(rut);
  }

  /** Envía el formulario */
  async submit() {
    await this.submitButton.click();
  }

  /** Busca un cliente por texto */
  async search(term) {
    await this.searchField.fill(term);
    await this.page.waitForTimeout(300);
  }

  /** Expande la primera fila de la tabla */
  async clickFirstRow() {
    await this.rows.first().waitFor({ state: 'visible' });
    await this.rows.first().click();
    await this.expandedPanel.waitFor({ state: 'visible' });
  }
}
