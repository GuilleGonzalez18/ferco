/**
 * validate.test.js — Tests unitarios para backend/src/middleware/validate.js
 * Corre con: node --test src/__tests__/validate.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRequired, validateMaxLength, validateMinLength,
  validatePositiveInt, validateNumber, validateEnum,
  validateBoolean, validateHexColor, validateIdentifier,
  validateDateFormat, validateBase64Size, validateArray,
  firstError, respondIfInvalid,
} from '../middleware/validate.js';

// Helper para mock del res de Express
function mockRes() {
  const state = { statusCode: null, body: null };
  return {
    status(code) { state.statusCode = code; return this; },
    json(data) { state.body = data; },
    get statusCode() { return state.statusCode; },
    get body() { return state.body; },
  };
}

// ─── validateRequired ─────────────────────────────────────────────────────────
describe('validateRequired', () => {
  it('pasa con string no vacío', () => assert.equal(validateRequired('hola', 'Campo'), null));
  it('pasa con string "0"', () => assert.equal(validateRequired('0', 'Campo'), null));
  it('falla con string vacío', () => assert.match(validateRequired('', 'Campo'), /requerido/));
  it('falla con solo espacios', () => assert.match(validateRequired('   ', 'Campo'), /requerido/));
  it('falla con null', () => assert.match(validateRequired(null, 'Campo'), /requerido/));
  it('falla con undefined', () => assert.match(validateRequired(undefined, 'Campo'), /requerido/));
  it('incluye el nombre del campo en el mensaje', () => assert.match(validateRequired('', 'Nombre'), /Nombre/));
});

// ─── validateMaxLength ────────────────────────────────────────────────────────
describe('validateMaxLength', () => {
  it('pasa con string en el límite exacto', () => assert.equal(validateMaxLength('abc', 3, 'Campo'), null));
  it('pasa con string por debajo del límite', () => assert.equal(validateMaxLength('ab', 3, 'Campo'), null));
  it('falla cuando excede el límite', () => assert.match(validateMaxLength('abcd', 3, 'Campo'), /3/));
  it('pasa con null (campo opcional)', () => assert.equal(validateMaxLength(null, 10, 'Campo'), null));
  it('pasa con undefined (campo opcional)', () => assert.equal(validateMaxLength(undefined, 10, 'Campo'), null));
});

// ─── validateMinLength ────────────────────────────────────────────────────────
describe('validateMinLength', () => {
  it('pasa con string en el mínimo exacto', () => assert.equal(validateMinLength('abc', 3, 'Campo'), null));
  it('pasa con string más largo que el mínimo', () => assert.equal(validateMinLength('abcde', 3, 'Campo'), null));
  it('falla con string más corto que el mínimo', () => assert.match(validateMinLength('ab', 3, 'Campo'), /3/));
  it('falla con null', () => assert.notEqual(validateMinLength(null, 1, 'Campo'), null));
});

// ─── validatePositiveInt ──────────────────────────────────────────────────────
describe('validatePositiveInt', () => {
  it('pasa con 1', () => assert.equal(validatePositiveInt(1, 'Campo'), null));
  it('pasa con 100', () => assert.equal(validatePositiveInt(100, 'Campo'), null));
  it('pasa con string "5" (coerce)', () => assert.equal(validatePositiveInt('5', 'Campo'), null));
  it('falla con 0', () => assert.match(validatePositiveInt(0, 'Campo'), /entero positivo/));
  it('falla con negativo', () => assert.match(validatePositiveInt(-1, 'Campo'), /entero positivo/));
  it('falla con float', () => assert.match(validatePositiveInt(1.5, 'Campo'), /entero positivo/));
  it('falla con string no numérico', () => assert.match(validatePositiveInt('abc', 'Campo'), /entero positivo/));
});

// ─── validateNumber ───────────────────────────────────────────────────────────
describe('validateNumber', () => {
  it('pasa con número en rango', () => assert.equal(validateNumber(5, 'Campo', { min: 0, max: 10 }), null));
  it('pasa con 0 cuando min es 0', () => assert.equal(validateNumber(0, 'Campo', { min: 0 }), null));
  it('pasa con null sin required', () => assert.equal(validateNumber(null, 'Campo'), null));
  it('falla con null cuando required', () => assert.match(validateNumber(null, 'Campo', { required: true }), /requerido/));
  it('falla con string vacío cuando required', () => assert.match(validateNumber('', 'Campo', { required: true }), /requerido/));
  it('falla con NaN', () => assert.match(validateNumber('abc', 'Campo'), /número válido/));
  it('falla por debajo del mínimo', () => assert.match(validateNumber(-1, 'Campo', { min: 0 }), /mayor o igual/));
  it('falla por encima del máximo', () => assert.match(validateNumber(11, 'Campo', { max: 10 }), /menor o igual/));
  it('falla con Infinity', () => assert.notEqual(validateNumber(Infinity, 'Campo'), null));
});

// ─── validateEnum ─────────────────────────────────────────────────────────────
describe('validateEnum', () => {
  const ALLOWED = ['a', 'b', 'c'];
  it('pasa con valor permitido', () => assert.equal(validateEnum('a', ALLOWED, 'Campo'), null));
  it('falla con valor no permitido', () => assert.match(validateEnum('z', ALLOWED, 'Campo'), /uno de/));
  it('pasa con null sin required', () => assert.equal(validateEnum(null, ALLOWED, 'Campo'), null));
  it('falla con null cuando required', () => assert.match(validateEnum(null, ALLOWED, 'Campo', { required: true }), /requerido/));
  it('incluye los valores permitidos en el mensaje', () => assert.match(validateEnum('z', ALLOWED, 'Campo'), /a, b, c/));
});

// ─── validateBoolean ──────────────────────────────────────────────────────────
describe('validateBoolean', () => {
  it('pasa con true', () => assert.equal(validateBoolean(true, 'Campo'), null));
  it('pasa con false', () => assert.equal(validateBoolean(false, 'Campo'), null));
  it('falla con string "true"', () => assert.match(validateBoolean('true', 'Campo'), /verdadero o falso/));
  it('falla con número 1', () => assert.match(validateBoolean(1, 'Campo'), /verdadero o falso/));
  it('falla con null', () => assert.match(validateBoolean(null, 'Campo'), /verdadero o falso/));
  it('falla con undefined', () => assert.match(validateBoolean(undefined, 'Campo'), /verdadero o falso/));
});

// ─── validateHexColor ─────────────────────────────────────────────────────────
describe('validateHexColor', () => {
  it('pasa con #FFF', () => assert.equal(validateHexColor('#FFF', 'Color'), null));
  it('pasa con #FFFFFF', () => assert.equal(validateHexColor('#FFFFFF', 'Color'), null));
  it('pasa con #abc (minúsculas)', () => assert.equal(validateHexColor('#abc', 'Color'), null));
  it('pasa con null (opcional)', () => assert.equal(validateHexColor(null, 'Color'), null));
  it('pasa con string vacío (opcional)', () => assert.equal(validateHexColor('', 'Color'), null));
  it('falla sin # (FFFFFF)', () => assert.match(validateHexColor('FFFFFF', 'Color'), /hexadecimal/));
  it('falla con #GGGGGG', () => assert.match(validateHexColor('#GGGGGG', 'Color'), /hexadecimal/));
  it('falla con #12345 (5 chars)', () => assert.match(validateHexColor('#12345', 'Color'), /hexadecimal/));
});

// ─── validateIdentifier ───────────────────────────────────────────────────────
describe('validateIdentifier', () => {
  it('pasa con letras y números', () => assert.equal(validateIdentifier('abc123', 'Campo'), null));
  it('pasa con guión y underscore', () => assert.equal(validateIdentifier('mi-campo_1', 'Campo'), null));
  it('pasa con null (opcional)', () => assert.equal(validateIdentifier(null, 'Campo'), null));
  it('falla con espacio', () => assert.match(validateIdentifier('mi campo', 'Campo'), /no permitidos/));
  it('falla con @', () => assert.match(validateIdentifier('campo@test', 'Campo'), /no permitidos/));
  it('falla con .', () => assert.match(validateIdentifier('campo.test', 'Campo'), /no permitidos/));
  it('falla con /', () => assert.match(validateIdentifier('a/b', 'Campo'), /no permitidos/));
});

// ─── validateDateFormat ───────────────────────────────────────────────────────
describe('validateDateFormat', () => {
  it('pasa con fecha válida YYYY-MM-DD', () => assert.equal(validateDateFormat('2024-01-15', 'Fecha'), null));
  it('pasa con null (opcional)', () => assert.equal(validateDateFormat(null, 'Fecha'), null));
  it('pasa con string vacío (opcional)', () => assert.equal(validateDateFormat('', 'Fecha'), null));
  it('falla con string inválido', () => assert.match(validateDateFormat('no-es-fecha', 'Fecha'), /fecha válida/));
});

// ─── validateBase64Size ───────────────────────────────────────────────────────
describe('validateBase64Size', () => {
  const ONE_MB = 1024 * 1024;
  it('pasa con null (opcional)', () => assert.equal(validateBase64Size(null, ONE_MB, 'Imagen'), null));
  it('pasa con string vacío (opcional)', () => assert.equal(validateBase64Size('', ONE_MB, 'Imagen'), null));
  it('pasa con base64 pequeño', () => {
    assert.equal(validateBase64Size('A'.repeat(100), ONE_MB, 'Imagen'), null);
  });
  it('falla cuando supera el límite', () => {
    const large = 'A'.repeat(Math.ceil(ONE_MB / 0.75) + 100);
    assert.match(validateBase64Size(large, ONE_MB, 'Imagen'), /tamaño máximo/);
  });
  it('incluye el tamaño en MB en el mensaje', () => {
    const large = 'A'.repeat(Math.ceil(ONE_MB / 0.75) + 100);
    assert.match(validateBase64Size(large, ONE_MB, 'Imagen'), /1 MB/);
  });
});

// ─── validateArray ────────────────────────────────────────────────────────────
describe('validateArray', () => {
  it('pasa con array no vacío', () => assert.equal(validateArray([1, 2], 'Lista'), null));
  it('pasa con array en el límite máximo por defecto (500)', () => assert.equal(validateArray(new Array(500).fill(1), 'Lista'), null));
  it('falla con array vacío (min=1 por defecto)', () => assert.match(validateArray([], 'Lista'), /al menos 1/));
  it('falla con array sobre el máximo (500)', () => assert.match(validateArray(new Array(501).fill(1), 'Lista'), /más de 500/));
  it('falla con null', () => assert.match(validateArray(null, 'Lista'), /lista/));
  it('falla con objeto plano', () => assert.match(validateArray({}, 'Lista'), /lista/));
  it('respeta min/max personalizados', () => {
    assert.equal(validateArray([1, 2, 3], 'Lista', { min: 2, max: 5 }), null);
    assert.notEqual(validateArray([1], 'Lista', { min: 2, max: 5 }), null);
    assert.notEqual(validateArray(new Array(6).fill(1), 'Lista', { min: 2, max: 5 }), null);
  });
});

// ─── firstError ───────────────────────────────────────────────────────────────
describe('firstError', () => {
  it('retorna null cuando todos son null', () => assert.equal(firstError(null, null, null), null));
  it('retorna el primer error no-null', () => assert.equal(firstError(null, 'error1', 'error2'), 'error1'));
  it('retorna el único error', () => assert.equal(firstError('solo error'), 'solo error'));
  it('ignora nulls y retorna el primer error real', () => assert.equal(firstError(null, null, 'último'), 'último'));
  it('retorna null con lista vacía de argumentos', () => assert.equal(firstError(), null));
});

// ─── respondIfInvalid ─────────────────────────────────────────────────────────
describe('respondIfInvalid', () => {
  it('envía 400 y retorna true cuando hay error', () => {
    const res = mockRes();
    const result = respondIfInvalid(res, 'Campo requerido');
    assert.equal(result, true);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'Campo requerido' });
  });
  it('no envía respuesta y retorna false cuando no hay error', () => {
    const res = mockRes();
    const result = respondIfInvalid(res, null);
    assert.equal(result, false);
    assert.equal(res.statusCode, null);
  });
  it('retorna false para string vacío (falsy)', () => {
    const res = mockRes();
    assert.equal(respondIfInvalid(res, ''), false);
  });
});
