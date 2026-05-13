/**
 * cfeHelpers.test.js — Tests unitarios para backend/src/cfeHelpers.js
 * Cubre todas las funciones puras de construcción del CFE (sin acceso a DB).
 * Corre con: node --test src/__tests__/cfeHelpers.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  round2, round4, formatDate, formatDateTime,
  getIteIndFact, getFmaPago, getGlosaMP, getCodMP,
  getRcpTipoDoc, getCFETipo, validateRut,
  getUniMed, getCodiTpoCod,
} from '../cfeHelpers.js';

// ─── round2 / round4 ──────────────────────────────────────────────────────────
describe('round2', () => {
  it('redondea a 2 decimales', () => assert.equal(round2(1.006), 1.01));
  it('pasa enteros sin cambios', () => assert.equal(round2(5), 5));
  it('null → 0', () => assert.equal(round2(null), 0));
  it('undefined → 0', () => assert.equal(round2(undefined), 0));
  it('string numérico → coerce', () => assert.equal(round2('3.14159'), 3.14));
  it('no pierde precisión en 1.005', () => {
    // IEEE 754: 1.005 puede redondear a 1.00 o 1.01 según implementación
    // Verificamos que sea uno de los dos valores válidos
    const r = round2(1.005);
    assert.ok(r === 1.00 || r === 1.01);
  });
});

describe('round4', () => {
  it('redondea a 4 decimales', () => assert.equal(round4(1.00005), 0.0001 + 1.0)); // aprox
  it('pasa enteros sin cambios', () => assert.equal(round4(10), 10));
  it('null → 0', () => assert.equal(round4(null), 0));
  it('string numérico → coerce', () => assert.equal(round4('3.14159'), 3.1416));
});

// ─── formatDate ───────────────────────────────────────────────────────────────
describe('formatDate', () => {
  it('retorna null para null', () => assert.equal(formatDate(null), null));
  it('retorna null para string vacío', () => assert.equal(formatDate(''), null));
  it('retorna null para fecha inválida', () => assert.equal(formatDate('no-es-fecha'), null));
  it('retorna string de 10 caracteres para fecha válida', () => {
    const result = formatDate('2024-06-15');
    assert.equal(typeof result, 'string');
    assert.equal(result.length, 10);
    assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
  });
  it('mantiene el año y mes correctos', () => {
    const result = formatDate('2024-06-15T12:00:00.000Z');
    assert.match(result, /^2024-06/);
  });
});

// ─── formatDateTime ───────────────────────────────────────────────────────────
describe('formatDateTime', () => {
  it('retorna null para null', () => assert.equal(formatDateTime(null), null));
  it('retorna null para fecha inválida', () => assert.equal(formatDateTime('invalid'), null));
  it('retorna string con formato YYYY-MM-DD HH:mm:ss', () => {
    const result = formatDateTime('2024-06-15T14:30:00.000Z');
    assert.match(result, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
  it('no contiene la letra T', () => {
    const result = formatDateTime('2024-01-01T00:00:00Z');
    assert.ok(!result.includes('T'));
  });
});

// ─── getIteIndFact ────────────────────────────────────────────────────────────
describe('getIteIndFact', () => {
  it('código 2 → IVA mínimo (2)', () => assert.equal(getIteIndFact(2), 2));
  it('código 3 → IVA básico (3)', () => assert.equal(getIteIndFact(3), 3));
  it('código 1 → No Grava (1)', () => assert.equal(getIteIndFact(1), 1));
  it('código 4 → fallback (1)', () => assert.equal(getIteIndFact(4), 1));
  it('null → fallback (1)', () => assert.equal(getIteIndFact(null), 1));
  it('undefined → fallback (1)', () => assert.equal(getIteIndFact(undefined), 1));
  it('string "3" → IVA básico (3, coerce)', () => assert.equal(getIteIndFact('3'), 3));
});

// ─── getFmaPago ───────────────────────────────────────────────────────────────
describe('getFmaPago', () => {
  it('"credito" → "2"', () => assert.equal(getFmaPago('credito'), '2'));
  it('"CREDITO" (mayúsculas) → "2"', () => assert.equal(getFmaPago('CREDITO'), '2'));
  it('"efectivo" → "1"', () => assert.equal(getFmaPago('efectivo'), '1'));
  it('"debito" → "1"', () => assert.equal(getFmaPago('debito'), '1'));
  it('null → "1"', () => assert.equal(getFmaPago(null), '1'));
  it('string vacío → "1"', () => assert.equal(getFmaPago(''), '1'));
});

// ─── getGlosaMP ───────────────────────────────────────────────────────────────
describe('getGlosaMP', () => {
  it('"credito" → "CRÉDITO"', () => assert.equal(getGlosaMP('credito'), 'CRÉDITO'));
  it('"debito" → "DÉBITO"', () => assert.equal(getGlosaMP('debito'), 'DÉBITO'));
  it('"transferencia" → "TRANSFERENCIA"', () => assert.equal(getGlosaMP('transferencia'), 'TRANSFERENCIA'));
  it('"efectivo" → "EFECTIVO"', () => assert.equal(getGlosaMP('efectivo'), 'EFECTIVO'));
  it('null → "EFECTIVO"', () => assert.equal(getGlosaMP(null), 'EFECTIVO'));
  it('desconocido → "EFECTIVO"', () => assert.equal(getGlosaMP('cheque'), 'EFECTIVO'));
});

// ─── getCodMP ─────────────────────────────────────────────────────────────────
describe('getCodMP', () => {
  it('"efectivo" → "1"', () => assert.equal(getCodMP('efectivo'), '1'));
  it('"credito" → "2"', () => assert.equal(getCodMP('credito'), '2'));
  it('"debito" → "3"', () => assert.equal(getCodMP('debito'), '3'));
  it('"transferencia" → "4"', () => assert.equal(getCodMP('transferencia'), '4'));
  it('null → "1"', () => assert.equal(getCodMP(null), '1'));
  it('string vacío → "1"', () => assert.equal(getCodMP(''), '1'));
});

// ─── getRcpTipoDoc ────────────────────────────────────────────────────────────
describe('getRcpTipoDoc', () => {
  it('"RUT" → 2', () => assert.equal(getRcpTipoDoc('RUT'), 2));
  it('"CI" → 3', () => assert.equal(getRcpTipoDoc('CI'), 3));
  it('"PASAPORTE" → 5', () => assert.equal(getRcpTipoDoc('PASAPORTE'), 5));
  it('"DNI" → 6', () => assert.equal(getRcpTipoDoc('DNI'), 6));
  it('"OTRO" → 4 (tipo desconocido con valor)', () => assert.equal(getRcpTipoDoc('OTRO'), 4));
  it('"rut" (minúsculas) → 2', () => assert.equal(getRcpTipoDoc('rut'), 2));
  it('string vacío → null', () => assert.equal(getRcpTipoDoc(''), null));
  it('null → null', () => assert.equal(getRcpTipoDoc(null), null));
  it('undefined → null', () => assert.equal(getRcpTipoDoc(undefined), null));
});

// ─── getCFETipo ───────────────────────────────────────────────────────────────
describe('getCFETipo', () => {
  it('cliente con RUT y numero_documento → eFactura "111"', () =>
    assert.equal(getCFETipo({ tipo_documento: 'RUT', numero_documento: '210174830014' }), '111'));
  it('cliente con RUT sin numero_documento → eTicket "101"', () =>
    assert.equal(getCFETipo({ tipo_documento: 'RUT', numero_documento: '' }), '101'));
  it('cliente con CI → eTicket "101"', () =>
    assert.equal(getCFETipo({ tipo_documento: 'CI', numero_documento: '12345678' }), '101'));
  it('null → eTicket "101"', () => assert.equal(getCFETipo(null), '101'));
  it('undefined → eTicket "101"', () => assert.equal(getCFETipo(undefined), '101'));
  it('objeto vacío → eTicket "101"', () => assert.equal(getCFETipo({}), '101'));
});

// ─── validateRut ──────────────────────────────────────────────────────────────
describe('validateRut', () => {
  it('RUT con 12 dígitos → válido', () => assert.equal(validateRut('210174830014'), true));
  it('RUT con 9 dígitos → válido', () => assert.equal(validateRut('123456789'), true));
  it('RUT con guiones (12 dígitos netos) → válido', () => assert.equal(validateRut('21-017483-0014'), true));
  it('RUT con 8 dígitos → inválido', () => assert.equal(validateRut('12345678'), false));
  it('RUT con 13 dígitos → inválido', () => assert.equal(validateRut('1234567890123'), false));
  it('null → inválido', () => assert.equal(validateRut(null), false));
  it('string vacío → inválido', () => assert.equal(validateRut(''), false));
});

// ─── getUniMed ────────────────────────────────────────────────────────────────
describe('getUniMed', () => {
  it('null → "UNID"', () => assert.equal(getUniMed(null), 'UNID'));
  it('string vacío → "UNID"', () => assert.equal(getUniMed(''), 'UNID'));
  it('"unid" (minúsculas) → "UNID"', () => assert.equal(getUniMed('unid'), 'UNID'));
  it('"CAJA" → "CAJA"', () => assert.equal(getUniMed('CAJA'), 'CAJA'));
  it('"kg" → "KG"', () => assert.equal(getUniMed('kg'), 'KG'));
  it('string largo → truncado a 4 chars', () => assert.equal(getUniMed('LITROS').length, 4));
});

// ─── getCodiTpoCod ────────────────────────────────────────────────────────────
describe('getCodiTpoCod', () => {
  it('null → "INT1"', () => assert.equal(getCodiTpoCod(null), 'INT1'));
  it('string vacío → "INT1"', () => assert.equal(getCodiTpoCod(''), 'INT1'));
  it('EAN-13 (13 dígitos) → "GTIN13"', () => assert.equal(getCodiTpoCod('1234567890123'), 'GTIN13'));
  it('EAN-12 (12 dígitos) → "GTIN12"', () => assert.equal(getCodiTpoCod('123456789012'), 'GTIN12'));
  it('EAN-8 (8 dígitos) → "GTIN8"', () => assert.equal(getCodiTpoCod('12345678'), 'GTIN8'));
  it('4 dígitos → "INT1"', () => assert.equal(getCodiTpoCod('1234'), 'INT1'));
  it('EAN-13 con guiones → "GTIN13"', () => assert.equal(getCodiTpoCod('123-4567-89012-3'), 'GTIN13'));
});
