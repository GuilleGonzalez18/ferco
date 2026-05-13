/**
 * cfeDescuentos.test.js — Tests unitarios para calcDescuentoGlobal y distributeGlobalDiscount
 * Corre con: node --test src/__tests__/cfeDescuentos.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcDescuentoGlobal, distributeGlobalDiscount } from '../cfeHelpers.js';

// ─── calcDescuentoGlobal ──────────────────────────────────────────────────────

describe('calcDescuentoGlobal', () => {
  // tipo ninguno / nulo
  it('tipo "ninguno" → 0', () => assert.equal(calcDescuentoGlobal('ninguno', 10, 100), 0));
  it('tipo null → 0', () => assert.equal(calcDescuentoGlobal(null, 10, 100), 0));
  it('tipo undefined → 0', () => assert.equal(calcDescuentoGlobal(undefined, 10, 100), 0));

  // tipo porcentaje
  it('porcentaje 10% sobre 200 → 20', () => assert.equal(calcDescuentoGlobal('porcentaje', 10, 200), 20));
  it('porcentaje 0% → 0', () => assert.equal(calcDescuentoGlobal('porcentaje', 0, 200), 0));
  it('porcentaje 100% → retorna base completa', () => assert.equal(calcDescuentoGlobal('porcentaje', 100, 150), 150));
  it('porcentaje >100% clampea a 100%', () => assert.equal(calcDescuentoGlobal('porcentaje', 150, 100), 100));
  it('porcentaje negativo → 0', () => assert.equal(calcDescuentoGlobal('porcentaje', -5, 100), 0));
  it('porcentaje 50% sobre baseNeta 0 → 0', () => assert.equal(calcDescuentoGlobal('porcentaje', 50, 0), 0));
  it('porcentaje 15% sobre 300 → 45', () => assert.equal(calcDescuentoGlobal('porcentaje', 15, 300), 45));

  // tipo fijo
  it('fijo 50 sobre 200 → 50', () => assert.equal(calcDescuentoGlobal('fijo', 50, 200), 50));
  it('fijo 0 → 0', () => assert.equal(calcDescuentoGlobal('fijo', 0, 200), 0));
  it('fijo mayor que base → clampea a base', () => assert.equal(calcDescuentoGlobal('fijo', 500, 200), 200));
  it('fijo negativo → 0', () => assert.equal(calcDescuentoGlobal('fijo', -10, 200), 0));
  it('fijo igual a base → retorna base completa', () => assert.equal(calcDescuentoGlobal('fijo', 300, 300), 300));
});

// ─── distributeGlobalDiscount ─────────────────────────────────────────────────

describe('distributeGlobalDiscount', () => {
  it('arreglo vacío → []', () => {
    assert.deepEqual(distributeGlobalDiscount([], 0), []);
  });

  it('descuento 0 → todos ceros', () => {
    assert.deepEqual(distributeGlobalDiscount([100, 200], 0), [0, 0]);
  });

  it('una línea → recibe el descuento completo', () => {
    assert.deepEqual(distributeGlobalDiscount([100], 20), [20]);
  });

  it('suma de la distribución es exactamente descGlobalAmount', () => {
    const result = distributeGlobalDiscount([100, 200, 50], 30);
    const total = Math.round(result.reduce((a, b) => a + b, 0) * 100) / 100;
    assert.equal(total, 30);
  });

  it('distribución 50/50 en dos líneas iguales', () => {
    const result = distributeGlobalDiscount([100, 100], 20);
    assert.equal(result[0], 10);
    assert.equal(result[1], 10);
  });

  it('distribución proporcional 2/3 y 1/3', () => {
    const result = distributeGlobalDiscount([200, 100], 30);
    assert.equal(result[0], 20);
    assert.equal(result[1], 10);
  });

  it('ningún valor es negativo', () => {
    const result = distributeGlobalDiscount([0, 50, 0], 20);
    for (const v of result) assert.ok(v >= 0, `Valor negativo: ${v}`);
  });

  it('baseNeta cero → todo va al último elemento', () => {
    const result = distributeGlobalDiscount([0, 0, 0], 15);
    assert.equal(result[result.length - 1], 15);
    assert.equal(result[0], 0);
    assert.equal(result[1], 0);
  });

  it('mantiene la longitud del arreglo entrada', () => {
    const lines = [10, 20, 30, 40];
    const result = distributeGlobalDiscount(lines, 5);
    assert.equal(result.length, lines.length);
  });

  it('tres líneas: suma exacta con proporciones irregulares', () => {
    // 100, 150, 250 → total 500; descuento 50
    const result = distributeGlobalDiscount([100, 150, 250], 50);
    const total = Math.round(result.reduce((a, b) => a + b, 0) * 100) / 100;
    assert.equal(total, 50);
  });
});
