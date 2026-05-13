/**
 * stock.integration.test.js — Tests de integración para ajustes de stock
 *
 * Requiere backend corriendo. Ver setup.js para instrucciones.
 * Corre con: RUN_INTEGRATION_TESTS=1 node --test src/__tests__/integration/stock.integration.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { skipIfNoServer, apiLogin, createApiClient, TEST_EMAIL, TEST_PASSWORD } from './setup.js';

skipIfNoServer();

describe('Integration — PATCH /productos/:id/stock', () => {
  let client;
  let productId;
  let stockInicial;

  before(async () => {
    const token = await apiLogin(TEST_EMAIL, TEST_PASSWORD);
    client = createApiClient(token);

    // Selecciona un producto activo
    const r = await client.get('/productos');
    assert.equal(r.status, 200);
    const productos = await r.json();
    const prod = productos.find((p) => p.activo);
    assert.ok(prod, 'Debe existir al menos un producto activo');
    productId = prod.id;
    stockInicial = Number(prod.stock);
  });

  after(async () => {
    // Restaura el stock original después de los tests
    await client.patch(`/productos/${productId}/stock`, { stock: stockInicial });
  });

  it('ajusta el stock al valor indicado', async () => {
    const nuevoStock = stockInicial + 5;
    const r = await client.patch(`/productos/${productId}/stock`, { stock: nuevoStock });
    assert.equal(r.status, 200, `Esperaba 200, recibió ${r.status}`);
    const body = await r.json();
    assert.equal(Number(body.stock), nuevoStock, 'El stock retornado debe ser el nuevo valor');
  });

  it('el movimiento de stock queda registrado con stock_anterior y stock_nuevo correctos', async () => {
    const rMov = await client.get(`/productos/${productId}/movimientos`);
    assert.equal(rMov.status, 200);
    const movs = await rMov.json();
    assert.ok(movs.length > 0, 'Debe haber al menos un movimiento registrado');

    const ultimo = movs[0]; // ordenado DESC por fecha
    assert.equal(Number(ultimo.stock_nuevo), stockInicial + 5);
    assert.equal(Number(ultimo.stock_anterior), stockInicial);
    assert.ok(ultimo.origen, 'El movimiento debe tener un origen registrado');
  });

  it('ajuste a 0 es válido', async () => {
    const r = await client.patch(`/productos/${productId}/stock`, { stock: 0 });
    assert.equal(r.status, 200);
    const body = await r.json();
    assert.equal(Number(body.stock), 0);
  });

  it('ajuste a producto inexistente retorna 404', async () => {
    const r = await client.patch('/productos/99999999/stock', { stock: 10 });
    assert.equal(r.status, 404);
  });
});

describe('Integration — GET /productos/:id/movimientos', () => {
  let client;
  let productId;

  before(async () => {
    const token = await apiLogin(TEST_EMAIL, TEST_PASSWORD);
    client = createApiClient(token);

    const r = await client.get('/productos');
    const productos = await r.json();
    const prod = productos.find((p) => p.activo);
    productId = prod?.id;
  });

  it('retorna lista de movimientos', async () => {
    assert.ok(productId);
    const r = await client.get(`/productos/${productId}/movimientos`);
    assert.equal(r.status, 200);
    const movs = await r.json();
    assert.ok(Array.isArray(movs));
  });

  it('sin token retorna 401', async () => {
    const r = await fetch(
      `${process.env.INTEGRATION_BASE_URL || 'http://localhost:3001'}/api/productos/${productId}/movimientos`
    );
    assert.equal(r.status, 401);
  });
});
