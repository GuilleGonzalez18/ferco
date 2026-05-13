/**
 * cfeSender.test.js — Tests unitarios para buildCfeConfig
 * Corre con: node --test src/__tests__/cfeSender.test.js
 *
 * Cubre SOLO modo LOCAL (el único disponible en este entorno).
 * Los modos PRUEBAS y PRODUCCION no tienen credenciales configuradas.
 */
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildCfeConfig } from '../cfeSender.js';

describe('buildCfeConfig', () => {
  const savedEnv = {};
  const TRACKED_VARS = ['CFE_HABILITADO', 'CFE_API_URL', 'CFE_API_TOKEN', 'CFE_TIMEOUT_MS'];

  before(() => {
    for (const k of TRACKED_VARS) savedEnv[k] = process.env[k];
  });

  after(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  beforeEach(() => {
    for (const k of TRACKED_VARS) delete process.env[k];
  });

  // ─── CFE deshabilitado ──────────────────────────────────────────────────────

  it('retorna null cuando CFE_HABILITADO no está definido', () => {
    assert.equal(buildCfeConfig({}), null);
  });

  it('retorna null cuando CFE_HABILITADO es "false"', () => {
    process.env.CFE_HABILITADO = 'false';
    assert.equal(buildCfeConfig({}), null);
  });

  it('retorna null cuando CFE_HABILITADO es "0"', () => {
    process.env.CFE_HABILITADO = '0';
    assert.equal(buildCfeConfig({}), null);
  });

  // ─── modo LOCAL sin credenciales ────────────────────────────────────────────

  it('retorna null cuando está habilitado pero sin CFE_API_URL ni CFE_API_TOKEN', () => {
    process.env.CFE_HABILITADO = 'true';
    assert.equal(buildCfeConfig({ cfe_ambiente: 'LOCAL' }), null);
  });

  it('retorna null cuando hay URL pero no token', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost:9999/cfe';
    assert.equal(buildCfeConfig({ cfe_ambiente: 'LOCAL' }), null);
  });

  it('retorna null cuando hay token pero no URL', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_TOKEN = 'tok';
    assert.equal(buildCfeConfig({ cfe_ambiente: 'LOCAL' }), null);
  });

  // ─── modo LOCAL con credenciales ────────────────────────────────────────────

  it('retorna config válida con URL y token', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost:9999/cfe';
    process.env.CFE_API_TOKEN = 'test-token-abc';

    const config = buildCfeConfig({ cfe_ambiente: 'LOCAL' });
    assert.ok(config !== null);
    assert.equal(config.url, 'http://localhost:9999/cfe');
    assert.equal(config.token, 'test-token-abc');
  });

  it('usa timeout por defecto de 20000ms', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost/cfe';
    process.env.CFE_API_TOKEN = 'tok';
    const config = buildCfeConfig({ cfe_ambiente: 'LOCAL' });
    assert.equal(config.timeoutMs, 20000);
  });

  it('respeta CFE_TIMEOUT_MS personalizado', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost/cfe';
    process.env.CFE_API_TOKEN = 'tok';
    process.env.CFE_TIMEOUT_MS = '5000';
    const config = buildCfeConfig({ cfe_ambiente: 'LOCAL' });
    assert.equal(config.timeoutMs, 5000);
  });

  it('impone timeout mínimo de 1000ms (rechaza valores muy bajos)', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost/cfe';
    process.env.CFE_API_TOKEN = 'tok';
    process.env.CFE_TIMEOUT_MS = '100';
    const config = buildCfeConfig({ cfe_ambiente: 'LOCAL' });
    assert.equal(config.timeoutMs, 1000);
  });

  it('ignora strings no numéricos en CFE_TIMEOUT_MS y usa default', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost/cfe';
    process.env.CFE_API_TOKEN = 'tok';
    process.env.CFE_TIMEOUT_MS = 'nope';
    const config = buildCfeConfig({ cfe_ambiente: 'LOCAL' });
    // NaN → parseInt('nope') = NaN → default 20000 → max(1000, 20000) = 20000
    assert.equal(config.timeoutMs, 20000);
  });

  // ─── empresa null / sin cfe_ambiente ────────────────────────────────────────

  it('empresa null usa LOCAL por defecto', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost/cfe';
    process.env.CFE_API_TOKEN = 'tok';
    assert.ok(buildCfeConfig(null) !== null);
  });

  it('empresa {} (sin cfe_ambiente) usa LOCAL por defecto', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost/cfe';
    process.env.CFE_API_TOKEN = 'tok';
    assert.ok(buildCfeConfig({}) !== null);
  });

  it('cfe_ambiente vacío usa LOCAL por defecto', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost/cfe';
    process.env.CFE_API_TOKEN = 'tok';
    assert.ok(buildCfeConfig({ cfe_ambiente: '' }) !== null);
  });

  it('cfe_ambiente "local" (minúsculas) equivale a LOCAL', () => {
    process.env.CFE_HABILITADO = 'true';
    process.env.CFE_API_URL = 'http://localhost/cfe';
    process.env.CFE_API_TOKEN = 'tok';
    const config = buildCfeConfig({ cfe_ambiente: 'local' });
    assert.ok(config !== null);
    assert.equal(config.url, 'http://localhost/cfe');
  });
});
