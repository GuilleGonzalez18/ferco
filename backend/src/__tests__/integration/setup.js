/**
 * integration/setup.js — Helpers para tests de integración de API
 *
 * Uso:
 *   - Requiere el backend corriendo (npm run dev en /backend)
 *   - Configura INTEGRATION_BASE_URL (default: http://localhost:3001)
 *   - O setea RUN_INTEGRATION_TESTS=1 para usar el default
 *
 * Para correr:
 *   RUN_INTEGRATION_TESTS=1 node --test src/__tests__/integration/ventas.integration.test.js
 */

const BASE_URL = process.env.INTEGRATION_BASE_URL || 'http://localhost:3001';

/**
 * Termina el proceso con un mensaje si no se activaron los tests de integración.
 * Llama al inicio de cada archivo de tests de integración.
 */
export function skipIfNoServer() {
  if (!process.env.INTEGRATION_BASE_URL && !process.env.RUN_INTEGRATION_TESTS) {
    console.log(
      '⏭  Tests de integración omitidos.\n' +
      '   Para correrlos: set RUN_INTEGRATION_TESTS=1 (requiere backend corriendo en localhost:3001)\n' +
      '   O: set INTEGRATION_BASE_URL=http://tuhost:puerto'
    );
    process.exit(0);
  }
}

/**
 * Obtiene un token JWT haciendo login.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} token
 */
export async function apiLogin(email, password) {
  const r = await fetch(`${BASE_URL}/api/usuarios/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: email, password }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Login falló (HTTP ${r.status}): ${text}`);
  }
  const data = await r.json();
  if (!data.token) throw new Error('Login no devolvió token');
  return data.token;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Cliente HTTP con auth adjunta.
 * @param {string} token
 */
export function createApiClient(token) {
  return {
    get: (path) =>
      fetch(`${BASE_URL}/api${path}`, { headers: authHeaders(token) }),

    post: (path, body) =>
      fetch(`${BASE_URL}/api${path}`, {
        method: 'POST',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    put: (path, body) =>
      fetch(`${BASE_URL}/api${path}`, {
        method: 'PUT',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    patch: (path, body) =>
      fetch(`${BASE_URL}/api${path}`, {
        method: 'PATCH',
        headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),

    delete: (path) =>
      fetch(`${BASE_URL}/api${path}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      }),
  };
}

/** Credenciales de prueba leídas del entorno (con fallback al usuario seed de E2E) */
export const TEST_EMAIL = process.env.INTEGRATION_EMAIL || process.env.E2E_ADMIN_EMAIL || 'e2e-admin@mercatus.com';
export const TEST_PASSWORD = process.env.INTEGRATION_PASSWORD || process.env.E2E_ADMIN_PASSWORD || 'TestPass123!';
