/**
 * ventas.integration.test.js — Tests de integración para el endpoint de ventas
 *
 * Requiere backend corriendo. Ver setup.js para instrucciones.
 * Corre con: RUN_INTEGRATION_TESTS=1 node --test src/__tests__/integration/ventas.integration.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { skipIfNoServer, apiLogin, createApiClient, TEST_EMAIL, TEST_PASSWORD } from './setup.js';

skipIfNoServer();

describe('Integration — POST /ventas', () => {
  let client;
  let productId;
  let stockInicial;
  let ventaId;

  before(async () => {
    const token = await apiLogin(TEST_EMAIL, TEST_PASSWORD);
    client = createApiClient(token);

    // Busca un producto activo con stock > 0
    const r = await client.get('/productos');
    assert.equal(r.status, 200, 'GET /productos debe retornar 200');
    const productos = await r.json();
    const prod = productos.find((p) => p.activo && Number(p.stock) > 0);
    assert.ok(prod, 'Debe existir al menos un producto activo con stock > 0 (correr db:seed:test)');
    productId = prod.id;
    stockInicial = Number(prod.stock);
  });

  it('POST /ventas crea la venta y descuenta una unidad de stock', async () => {
    const payload = {
      cliente_id: null,
      descuento_total_tipo: 'ninguno',
      descuento_total_valor: 0,
      observacion: '[TEST-INTEGRATION] borrar',
      detalle: [
        {
          producto_id: productId,
          cantidad: 1,
          precio_unitario: 100,
          descuento_tipo: 'ninguno',
          descuento_valor: 0,
          descuento_aplicado: 0,
          packs: 0,
          unidades_sueltas: 1,
          modo_venta: 'sueltas',
        },
      ],
      pagos: [{ medio_pago: 'efectivo', monto: 100 }],
    };

    const r = await client.post('/ventas', payload);
    assert.equal(r.status, 201, `Esperaba 201, recibió ${r.status}`);
    const body = await r.json();
    assert.ok(body.id, 'La respuesta debe incluir el id de la venta creada');
    ventaId = body.id;

    // Verifica que el stock bajó en 1
    const rProds = await client.get('/productos');
    const productos = await rProds.json();
    const prod = productos.find((p) => p.id === productId);
    assert.equal(Number(prod.stock), stockInicial - 1, 'El stock debe haber bajado en 1');
  });

  it('GET /ventas retorna la venta recién creada', async () => {
    assert.ok(ventaId, 'Depende del test anterior');
    const r = await client.get('/ventas');
    assert.equal(r.status, 200);
    const ventas = await r.json();
    const found = ventas.find((v) => v.id === ventaId);
    assert.ok(found, `La venta #${ventaId} debe aparecer en el listado`);
  });

  it('PUT /ventas/:id/cancelar restaura el stock al valor original', async () => {
    assert.ok(ventaId, 'Depende del test anterior');
    const r = await client.put(`/ventas/${ventaId}/cancelar`, { motivo: '[TEST] cancelación de integración' });
    assert.equal(r.status, 200, `Esperaba 200, recibió ${r.status}`);

    // Verifica que el stock volvió al valor original
    const rProds = await client.get('/productos');
    const productos = await rProds.json();
    const prod = productos.find((p) => p.id === productId);
    assert.equal(Number(prod.stock), stockInicial, 'El stock debe haberse restaurado al valor inicial');
  });
});

describe('Integration — validación de ventas', () => {
  let client;

  before(async () => {
    const token = await apiLogin(TEST_EMAIL, TEST_PASSWORD);
    client = createApiClient(token);
  });

  it('POST /ventas sin detalle retorna 400', async () => {
    const r = await client.post('/ventas', {
      pagos: [{ medio_pago: 'efectivo', monto: 100 }],
      detalle: [],
    });
    assert.ok(r.status === 400 || r.status === 422, `Esperaba 400/422, recibió ${r.status}`);
  });

  it('POST /ventas sin pagos retorna 400', async () => {
    const r = await client.post('/ventas', {
      detalle: [{ producto_id: 1, cantidad: 1, precio_unitario: 100 }],
      pagos: [],
    });
    assert.ok(r.status === 400 || r.status === 422, `Esperaba 400/422, recibió ${r.status}`);
  });

  it('GET /ventas/:id con ID inexistente retorna 404', async () => {
    const r = await client.get('/ventas/99999999');
    assert.equal(r.status, 404);
  });

  it('PUT /ventas/:id/cancelar con ID inexistente retorna 404', async () => {
    const r = await client.put('/ventas/99999999/cancelar', { motivo: 'test' });
    assert.equal(r.status, 404);
  });
});

describe('Integration — autenticación de ventas', () => {
  it('GET /ventas sin token retorna 401', async () => {
    const r = await fetch(`${process.env.INTEGRATION_BASE_URL || 'http://localhost:3001'}/api/ventas`);
    assert.equal(r.status, 401);
  });

  it('POST /ventas sin token retorna 401', async () => {
    const r = await fetch(
      `${process.env.INTEGRATION_BASE_URL || 'http://localhost:3001'}/api/ventas`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detalle: [], pagos: [] }),
      }
    );
    assert.equal(r.status, 401);
  });
});
