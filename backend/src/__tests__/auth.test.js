/**
 * auth.test.js — Tests unitarios para funciones puras de backend/src/auth.js
 * Corre con: node --test src/__tests__/auth.test.js
 *
 * Nota: Se usa dynamic import para poder setear JWT_SECRET antes de que
 * el módulo auth.js lo lea al inicializarse.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret-abc123-must-be-long-enough-32chars';
process.env.JWT_SECRET = TEST_SECRET;

// Dynamic import para que auth.js lea JWT_SECRET ya seteado
const { normalizeTipo, isPropietario, getAuthUserFromRequest } =
  await import('../auth.js');

// Helper para construir mock de req
function makeReq(token) {
  if (!token) return { headers: {} };
  return { headers: { authorization: `Bearer ${token}` } };
}

// ─── normalizeTipo ────────────────────────────────────────────────────────────
describe('normalizeTipo', () => {
  it('"propietario" → "propietario"', () => assert.equal(normalizeTipo('propietario'), 'propietario'));
  it('"admin" → "propietario"', () => assert.equal(normalizeTipo('admin'), 'propietario'));
  it('"PROPIETARIO" (mayúsculas) → "propietario"', () => assert.equal(normalizeTipo('PROPIETARIO'), 'propietario'));
  it('"vendedor" → "vendedor"', () => assert.equal(normalizeTipo('vendedor'), 'vendedor'));
  it('"Vendedor" (mixto) → "vendedor"', () => assert.equal(normalizeTipo('Vendedor'), 'vendedor'));
  it('string vacío → "vendedor"', () => assert.equal(normalizeTipo(''), 'vendedor'));
  it('null → "vendedor"', () => assert.equal(normalizeTipo(null), 'vendedor'));
  it('undefined → "vendedor"', () => assert.equal(normalizeTipo(undefined), 'vendedor'));
  it('string desconocido → "vendedor"', () => assert.equal(normalizeTipo('gerente'), 'vendedor'));
});

// ─── isPropietario ────────────────────────────────────────────────────────────
describe('isPropietario', () => {
  it('{ rol_nombre: "propietario" } → true', () =>
    assert.equal(isPropietario({ rol_nombre: 'propietario' }), true));
  it('{ tipo: "propietario" } → true', () =>
    assert.equal(isPropietario({ tipo: 'propietario' }), true));
  it('{ tipo: "admin" } → true', () =>
    assert.equal(isPropietario({ tipo: 'admin' }), true));
  it('{ rol_nombre: "vendedor" } → false', () =>
    assert.equal(isPropietario({ rol_nombre: 'vendedor' }), false));
  it('{ tipo: "vendedor" } → false', () =>
    assert.equal(isPropietario({ tipo: 'vendedor' }), false));
  it('null → false', () => assert.equal(isPropietario(null), false));
  it('undefined → false', () => assert.equal(isPropietario(undefined), false));
  it('objeto vacío → false', () => assert.equal(isPropietario({}), false));
});

// ─── getAuthUserFromRequest ───────────────────────────────────────────────────
describe('getAuthUserFromRequest', () => {
  it('retorna null si no hay Authorization header', () => {
    assert.equal(getAuthUserFromRequest(makeReq(null)), null);
  });

  it('retorna null con token malformado', () => {
    assert.equal(getAuthUserFromRequest(makeReq('no-es-un-jwt')), null);
  });

  it('retorna null con token expirado', () => {
    const expired = jwt.sign({ sub: '1' }, TEST_SECRET, { expiresIn: -1 });
    assert.equal(getAuthUserFromRequest(makeReq(expired)), null);
  });

  it('retorna null con token firmado con secret distinto', () => {
    const wrongToken = jwt.sign({ sub: '1' }, 'otro-secreto-diferente');
    assert.equal(getAuthUserFromRequest(makeReq(wrongToken)), null);
  });

  it('retorna null si sub no es un entero positivo', () => {
    const badSub = jwt.sign({ sub: 'no-es-numero' }, TEST_SECRET);
    assert.equal(getAuthUserFromRequest(makeReq(badSub)), null);
  });

  it('retorna null si sub es 0', () => {
    const zeroSub = jwt.sign({ sub: '0' }, TEST_SECRET);
    assert.equal(getAuthUserFromRequest(makeReq(zeroSub)), null);
  });

  it('retorna user con id correcto para token válido', () => {
    const token = jwt.sign(
      { sub: '42', username: 'testuser', tipo: 'vendedor' },
      TEST_SECRET,
    );
    const user = getAuthUserFromRequest(makeReq(token));
    assert.notEqual(user, null);
    assert.equal(user.id, 42);
    assert.equal(user.username, 'testuser');
    assert.equal(user.tipo, 'vendedor');
  });

  it('retorna todos los campos del payload JWT', () => {
    const payload = {
      sub: '7',
      username: 'admin',
      correo: 'admin@test.com',
      nombre: 'Admin',
      apellido: 'Test',
      tipo: 'propietario',
      rol_id: 1,
      rol_nombre: 'propietario',
    };
    const token = jwt.sign(payload, TEST_SECRET);
    const user = getAuthUserFromRequest(makeReq(token));
    assert.equal(user.id, 7);
    assert.equal(user.username, 'admin');
    assert.equal(user.correo, 'admin@test.com');
    assert.equal(user.nombre, 'Admin');
    assert.equal(user.apellido, 'Test');
    assert.equal(user.tipo, 'propietario');
    assert.equal(user.rol_id, 1);
    assert.equal(user.rol_nombre, 'propietario');
  });

  it('campos ausentes en payload se mapean a null', () => {
    const token = jwt.sign({ sub: '3' }, TEST_SECRET);
    const user = getAuthUserFromRequest(makeReq(token));
    assert.equal(user.username, null);
    assert.equal(user.correo, null);
    assert.equal(user.nombre, null);
    assert.equal(user.rol_nombre, null);
  });
});
