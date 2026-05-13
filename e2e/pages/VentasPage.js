export class VentasPage {
  constructor(page) {
    this.page = page;
    this.navButton = page.locator('#dashboard-nav-nueva-venta');
    this.productSearch = page.locator('#nueva-venta-productos-busqueda');
    this.nextStepButton = page.locator('#nueva-venta-paso-productos-siguiente');
    this.confirmButton = page.locator('#nueva-venta-venta-confirmar');
    this.successModal = page.locator('.venta-final-modal');
    this.newSaleButton = page.locator('#nueva-venta-venta-final-nueva-venta');
  }

  async navigate() {
    await this.navButton.click();
    await this.productSearch.waitFor({ state: 'visible' });
  }

  async addProductByName(name) {
    await this.productSearch.fill(name);
    await this.page.waitForTimeout(400);
    const firstAdd = this.page.locator('[id^="nueva-venta-producto-"][id$="-agregar"]').first();
    await firstAdd.click();
  }

  async confirmSale() {
    await this.nextStepButton.click();
    await this.confirmButton.waitFor({ state: 'visible' });
    await this.confirmButton.click();
    await this.successModal.waitFor({ state: 'visible' });
  }

  async startNewSale() {
    await this.newSaleButton.click();
    await this.productSearch.waitFor({ state: 'visible' });
  }
}
