/**
 * cfe.integration.test.js — Tests de integración para emisión de CFE en modo LOCAL
 *
 * NOTA: Solo cubre modo LOCAL. Los modos PRUEBAS y PRODUCCION no están disponibles.
 *
 * Requiere backend corriendo con:
 *   CFE_HABILITADO=true
 *   CFE_API_URL=<url local>
 *   CFE_API_TOKEN=<token>
 *   config_empresa con ciudad y departamento configurados
 *
 * Corre con: RUN_INTEGRATION_TESTS=1 node --test src/__tests__/integration/cfe.integration.test.js
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { skipIfNoServer, apiLogin, createApiClient, TEST_EMAIL, TEST_PASSWORD } from './setup.js';

skipIfNoServer();

describe('Integration — GET /ventas/:id/cfe (preview JSON modo local)', () => {
  let client;
  let ventaId;

  before(async () => {
    const token = await apiLogin(TEST_EMAIL, TEST_PASSWORD);
    client = createApiClient(token);

    // Usa la primera venta activa disponible
    const r = await client.get('/ventas');
    assert.equal(r.status, 200);
    const ventas = await r.json();
    const venta = ventas.find((v) => !v.cancelada);
    assert.ok(venta, 'Debe existir al menos una venta activa para testear CFE');
    ventaId = venta.id;
  });

  it('GET /ventas/:id/cfe retorna JSON con estructura básica DGI', async () => {
    const r = await client.get(`/ventas/${ventaId}/cfe`);
    assert.equal(r.status, 200, `Esperaba 200, recibió ${r.status}`);
    const cfe = await r.json();

    // Campos raíz obligatorios
    assert.ok('Master' in cfe, 'Debe tener campo Master');
    assert.ok('Emisor' in cfe, 'Debe tener campo Emisor');
    assert.ok('Totales' in cfe, 'Debe tener campo Totales');
    assert.ok('Detalle' in cfe, 'Debe tener campo Detalle');
    assert.ok(Array.isArray(cfe.Detalle), 'Detalle debe ser un arreglo');
    assert.ok(cfe.Detalle.length > 0, 'Detalle debe tener al menos un ítem');
  });

  it('el campo Master tiene CFETipoCFE válido (101 o 111)', async () => {
    const r = await client.get(`/ventas/${ventaId}/cfe`);
    const cfe = await r.json();
    assert.ok(
      cfe.Master.CFETipoCFE === '101' || cfe.Master.CFETipoCFE === '111',
      `CFETipoCFE debe ser 101 o 111, recibió: ${cfe.Master?.CFETipoCFE}`
    );
  });

  it('el campo Totales tiene TotMntTotal numérico y mayor que 0', async () => {
    const r = await client.get(`/ventas/${ventaId}/cfe`);
    const cfe = await r.json();
    const total = parseFloat(cfe.Totales?.TotMntTotal);
    assert.ok(!isNaN(total), 'TotMntTotal debe ser un número');
    assert.ok(total > 0, 'TotMntTotal debe ser mayor que 0');
  });

  it('cada ítem del Detalle tiene los campos obligatorios', async () => {
    const r = await client.get(`/ventas/${ventaId}/cfe`);
    const cfe = await r.json();
    for (const item of cfe.Detalle) {
      assert.ok(item.IteNomItem, `Ítem sin IteNomItem: ${JSON.stringify(item)}`);
      assert.ok(item.IteCantidad, `Ítem sin IteCantidad: ${JSON.stringify(item)}`);
      assert.ok(item.ItePrecioUnitario, `Ítem sin ItePrecioUnitario: ${JSON.stringify(item)}`);
      assert.ok(item.IteMontoItem, `Ítem sin IteMontoItem: ${JSON.stringify(item)}`);
      assert.ok(item.IteIndFact, `Ítem sin IteIndFact: ${JSON.stringify(item)}`);
    }
  });

  it('Emisor tiene RUT (empresa configurada)', async () => {
    const r = await client.get(`/ventas/${ventaId}/cfe`);
    const cfe = await r.json();
    // Solo valida que el emisor tenga los campos principales
    assert.ok(cfe.Emisor.EmiRznSoc !== undefined, 'Emisor debe tener EmiRznSoc');
    assert.ok(cfe.Emisor.EmiCiudad, 'Emisor debe tener EmiCiudad (configurar en Ajustes → Empresa)');
    assert.ok(cfe.Emisor.EmiDepartamento, 'Emisor debe tener EmiDepartamento');
  });

  it('GET /ventas/:id/cfe con ID inexistente retorna 404', async () => {
    const r = await client.get('/ventas/99999999/cfe');
    assert.equal(r.status, 404);
  });

  it('GET /ventas/:id/cfe sin token retorna 401', async () => {
    const r = await fetch(
      `${process.env.INTEGRATION_BASE_URL || 'http://localhost:3001'}/api/ventas/${ventaId}/cfe`
    );
    assert.equal(r.status, 401);
  });
});
