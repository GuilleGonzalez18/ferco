/**
 * pbt.test.js — Property-Based Testing con fast-check
 *
 * Verifica invariantes de negocio que deben sostenerse para cualquier
 * input válido, no solo para casos específicos.
 *
 * Dominios cubiertos:
 *   1. round2 / round4  — aritmética de redondeo
 *   2. Funciones de clasificación CFE — siempre retornan valores del conjunto esperado
 *   3. validateNumber — cualquier valor en [min,max] siempre pasa
 *   4. Totales CFE — TotMntTotal = suma de sus componentes (invariante contable)
 *   5. Stock no negativo — round2(stock * precio) >= 0 cuando ambos >= 0
 *   6. Descuento global — nunca excede la base neta
 *   7. firstError — siempre retorna el primer error o null
 *
 * Corre con: node --test src/__tests__/pbt.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  round2, round4,
  getIteIndFact, getFmaPago, getCodMP, getGlosaMP,
  getRcpTipoDoc, getCFETipo, getUniMed, getCodiTpoCod,
  calcDescuentoGlobal, distributeGlobalDiscount,
} from '../cfeHelpers.js';
import {
  validateNumber, validateArray, firstError,
} from '../middleware/validate.js';

// ─── Arbitrarios reutilizables ────────────────────────────────────────────────
// fc.double puede generar -0 y subnormals negativos cercanos a 0.
// Usamos .filter para excluir -0 (Object.is(-0,0)=false rompe assert.equal),
// y limitamos el rango para evitar overflow en round2/round4.
const finiteFloat = fc.double({ min: -1e10, max: 1e10, noNaN: true })
  .filter((x) => !Object.is(x, -0));
const nonNegativeFloat = fc.double({ min: 0, max: 1e10, noNaN: true })
  .map((x) => Math.abs(x)); // Math.abs garantiza nunca -0 ni subnormals negativos
const medioPagoArb = fc.constantFrom('efectivo', 'credito', 'debito', 'transferencia', 'EFECTIVO', 'CREDITO', '');
const tipoDocArb = fc.constantFrom('RUT', 'CI', 'PASAPORTE', 'DNI', 'OTRO', 'otro', 'rut', '', null, undefined);

// ─── 1. round2 ────────────────────────────────────────────────────────────────
describe('PBT: round2', () => {
  it('es idempotente: round2(round2(x)) === round2(x)', () => {
    fc.assert(
      fc.property(finiteFloat, (x) => {
        const r = round2(x);
        // +0 normaliza -0 para evitar Object.is(-0, 0) = false en assert strict
        assert.equal(round2(r) + 0, r + 0);
      }),
      { numRuns: 1000 },
    );
  });

  it('siempre produce un numero finito para input finito', () => {
    fc.assert(
      fc.property(finiteFloat, (x) => {
        const r = round2(x);
        assert.ok(Number.isFinite(r), `round2(${x}) = ${r} no es finito`);
      }),
      { numRuns: 1000 },
    );
  });

  it('para inputs >= 0 siempre produce resultado >= 0', () => {
    fc.assert(
      fc.property(nonNegativeFloat, (x) => {
        assert.ok(round2(x) >= 0, `round2(${x}) < 0`);
      }),
      { numRuns: 1000 },
    );
  });

  it('round2(a + b) difiere de round2(a) + round2(b) en maximo 0.015', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        fc.double({ min: -1e6, max: 1e6, noNaN: true }),
        (a, b) => {
          const diff = Math.abs(round2(a + b) - (round2(a) + round2(b)));
          assert.ok(diff <= 0.015, `|round2(${a}+${b}) - (round2(${a})+round2(${b}))| = ${diff} > 0.015`);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ─── 2. round4 ────────────────────────────────────────────────────────────────
describe('PBT: round4', () => {
  it('es idempotente: round4(round4(x)) === round4(x)', () => {
    fc.assert(
      fc.property(finiteFloat, (x) => {
        const r = round4(x);
        // +0 normaliza -0
        assert.equal(round4(r) + 0, r + 0);
      }),
      { numRuns: 1000 },
    );
  });

  it('|round4(x) - x| <= 0.00005 para cualquier x finito', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1e8, max: 1e8, noNaN: true }),
        (x) => {
          assert.ok(
            Math.abs(round4(x) - x) <= 0.00005,
            `round4(${x}) = ${round4(x)} esta fuera del rango esperado`,
          );
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ─── 3. Funciones de clasificacion CFE — siempre del conjunto esperado ────────
describe('PBT: getIteIndFact — siempre retorna 1, 2 o 3', () => {
  it('para cualquier input numerico', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer({ min: -10, max: 10 }), fc.constant(null), fc.constant(undefined)),
        (x) => {
          const result = getIteIndFact(x);
          assert.ok([1, 2, 3].includes(result), `getIteIndFact(${x}) = ${result} no esta en {1,2,3}`);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('PBT: getFmaPago — siempre retorna "1" o "2"', () => {
  it('para cualquier string o null', () => {
    fc.assert(
      fc.property(fc.oneof(medioPagoArb, fc.string()), (x) => {
        const result = getFmaPago(x);
        assert.ok(['1', '2'].includes(result), `getFmaPago(${x}) = ${result} no esta en {"1","2"}`);
      }),
      { numRuns: 500 },
    );
  });
});

describe('PBT: getCodMP — siempre retorna uno de "1","2","3","4"', () => {
  it('para cualquier input', () => {
    fc.assert(
      fc.property(fc.oneof(medioPagoArb, fc.string()), (x) => {
        const result = getCodMP(x);
        assert.ok(['1', '2', '3', '4'].includes(result), `getCodMP(${x}) = ${result} no esta en {"1","2","3","4"}`);
      }),
      { numRuns: 500 },
    );
  });
});

describe('PBT: getGlosaMP — siempre retorna un string no vacio', () => {
  it('para cualquier input', () => {
    fc.assert(
      fc.property(fc.oneof(medioPagoArb, fc.string()), (x) => {
        const result = getGlosaMP(x);
        assert.ok(
          typeof result === 'string' && result.length > 0,
          `getGlosaMP(${x}) = "${result}" esta vacio`,
        );
      }),
      { numRuns: 500 },
    );
  });
});

describe('PBT: getCFETipo — siempre retorna "101" o "111"', () => {
  it('para cualquier cliente o null', () => {
    const clienteArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.record({
        tipo_documento: tipoDocArb,
        numero_documento: fc.oneof(fc.string(), fc.constant(null), fc.constant('')),
      }),
    );
    fc.assert(
      fc.property(clienteArb, (cliente) => {
        const result = getCFETipo(cliente);
        assert.ok(['101', '111'].includes(result), `getCFETipo retorno ${result}`);
      }),
      { numRuns: 1000 },
    );
  });
});

describe('PBT: getUniMed — resultado siempre 1-4 chars, uppercase, no vacio', () => {
  it('para cualquier string de unidad', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.constant(null), fc.constant('')), (x) => {
        const result = getUniMed(x);
        assert.ok(typeof result === 'string', 'No es string');
        assert.ok(result.length >= 1 && result.length <= 4, `Longitud invalida: ${result.length}`);
        assert.equal(result, result.toUpperCase(), `No es uppercase: "${result}"`);
        assert.ok(result.trim().length > 0, 'Esta vacio o solo espacios');
      }),
      { numRuns: 1000 },
    );
  });
});

describe('PBT: getCodiTpoCod — siempre retorna uno de los tipos conocidos', () => {
  const KNOWN_TYPES = ['INT1', 'GTIN8', 'GTIN12', 'GTIN13'];
  it('para cualquier EAN o null', () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.constant(null), fc.constant('')), (ean) => {
        const result = getCodiTpoCod(ean);
        assert.ok(KNOWN_TYPES.includes(result), `getCodiTpoCod("${ean}") = "${result}" no esta en tipos conocidos`);
      }),
      { numRuns: 1000 },
    );
  });
});

describe('PBT: getRcpTipoDoc — siempre retorna un entero positivo o null', () => {
  it('para cualquier tipo de documento', () => {
    fc.assert(
      fc.property(fc.oneof(tipoDocArb, fc.string()), (x) => {
        const result = getRcpTipoDoc(x);
        const valid = result === null || (Number.isInteger(result) && result > 0);
        assert.ok(valid, `getRcpTipoDoc(${x}) = ${result} no es entero positivo ni null`);
      }),
      { numRuns: 1000 },
    );
  });
});

// ─── 4. validateNumber — cualquier valor en [min,max] siempre pasa ────────────
describe('PBT: validateNumber — invariante de rango', () => {
  it('cualquier valor en [min, max] siempre retorna null (pasa)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        (a, b) => {
          const [min, max] = a <= b ? [a, b] : [b, a];
          const inRange = (min + max) / 2;
          const result = validateNumber(inRange, 'Campo', { min, max });
          assert.equal(result, null, `validateNumber(${inRange}, {min:${min}, max:${max}}) fallo`);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('un valor justo fuera del rango siempre falla', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0.01, max: 1000, noNaN: true }),
        (min, delta) => {
          const max = min + delta;
          assert.notEqual(validateNumber(min - 1, 'Campo', { min, max }), null);
          assert.notEqual(validateNumber(max + 1, 'Campo', { min, max }), null);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ─── 5. Stock no negativo ─────────────────────────────────────────────────────
describe('PBT: invariante stock no negativo', () => {
  it('round2(stock * precio_unitario) >= 0 para cualquier stock y precio >= 0', () => {
    fc.assert(
      fc.property(nonNegativeFloat, nonNegativeFloat, (stock, precio) => {
        const total = round2(stock * precio);
        assert.ok(total >= 0, `round2(${stock} * ${precio}) = ${total} < 0`);
      }),
      { numRuns: 2000 },
    );
  });

  it('descuento aplicado <= monto bruto cuando descuento_pct en [0, 100]', () => {
    fc.assert(
      fc.property(
        nonNegativeFloat,
        fc.float({ min: 0, max: 100, noNaN: true }),
        (montoBruto, pct) => {
          const descuento = round2((montoBruto * pct) / 100);
          const montoNeto = round2(montoBruto - descuento);
          assert.ok(descuento >= 0, 'Descuento negativo');
          assert.ok(montoNeto >= -0.01, `Monto neto ${montoNeto} < 0 con bruto=${montoBruto} pct=${pct}`);
        },
      ),
      { numRuns: 2000 },
    );
  });
});

// ─── 6. Invariante contable CFE ───────────────────────────────────────────────
describe('PBT: invariante contable — TotMntTotal = sum(componentes)', () => {
  it('total = suma de partes (error max 0.01)', () => {
    fc.assert(
      fc.property(
        nonNegativeFloat,
        nonNegativeFloat,
        nonNegativeFloat,
        nonNegativeFloat,
        nonNegativeFloat,
        (totNoGrav, totNetoMin, totNetoBasica, totIvaMin, totIvaBasica) => {
          const components = [totNoGrav, totNetoMin, totNetoBasica, totIvaMin, totIvaBasica].map(round2);
          const totTotal = round2(components.reduce((a, b) => a + b, 0));
          const sumaParts = components.reduce((a, b) => a + b, 0);
          const diff = Math.abs(totTotal - sumaParts);
          assert.ok(diff <= 0.01, `|totTotal - sumaParts| = ${diff} > 0.01`);
          assert.ok(totTotal >= 0, `TotMntTotal ${totTotal} < 0`);
        },
      ),
      { numRuns: 2000 },
    );
  });
});

// ─── 7. Descuento global — nunca excede la base neta ─────────────────────────
describe('PBT: descuento global no excede la base neta', () => {
  it('descuento porcentual: resultado <= baseNeta y >= 0', () => {
    fc.assert(
      fc.property(
        nonNegativeFloat,
        fc.float({ min: 0, max: 100, noNaN: true }),
        (baseNeta, pct) => {
          const pctClamped = Math.max(0, Math.min(100, pct));
          const descGlobal = round2((baseNeta * pctClamped) / 100);
          assert.ok(descGlobal >= 0, `Descuento global negativo: ${descGlobal}`);
          assert.ok(descGlobal <= baseNeta + 0.01, `Descuento ${descGlobal} > base ${baseNeta}`);
        },
      ),
      { numRuns: 2000 },
    );
  });

  it('descuento fijo: resultado = min(valor, baseNeta) y >= 0', () => {
    fc.assert(
      fc.property(
        nonNegativeFloat,
        nonNegativeFloat,
        (baseNeta, descFijo) => {
          const descGlobal = round2(Math.max(0, Math.min(baseNeta, descFijo)));
          assert.ok(descGlobal >= 0, `Descuento fijo negativo: ${descGlobal}`);
          assert.ok(descGlobal <= baseNeta + 0.01, `Descuento ${descGlobal} > base ${baseNeta}`);
        },
      ),
      { numRuns: 2000 },
    );
  });
});

// ─── 8. firstError — siempre retorna el primer error o null ──────────────────
describe('PBT: firstError — primera string no-null o null', () => {
  it('si todos son null, retorna null', () => {
    fc.assert(
      fc.property(fc.array(fc.constant(null), { minLength: 0, maxLength: 10 }), (arr) => {
        assert.equal(firstError(...arr), null);
      }),
      { numRuns: 500 },
    );
  });

  it('siempre retorna el primer elemento no-null no-falsy', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.constant(null), fc.string({ minLength: 1 })), { minLength: 1, maxLength: 10 }),
        (arr) => {
          const expected = arr.find(Boolean) ?? null;
          assert.equal(firstError(...arr), expected);
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ─── 9. validateArray — los limites siempre se respetan ──────────────────────
describe('PBT: validateArray — invariante de limites', () => {
  it('array de tamano en [min, max] siempre pasa', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (minLen, delta) => {
          const maxLen = minLen + delta;
          const len = minLen + Math.floor(delta / 2);
          const arr = new Array(len).fill(1);
          const result = validateArray(arr, 'Lista', { min: minLen, max: maxLen });
          assert.equal(result, null, `validateArray(len=${len}, min=${minLen}, max=${maxLen}) fallo`);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('array de tamano fuera de [min, max] siempre falla', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 50 }),
        (minLen, delta) => {
          const maxLen = minLen + delta;
          if (minLen > 0) {
            const smallArr = new Array(minLen - 1).fill(1);
            assert.notEqual(validateArray(smallArr, 'Lista', { min: minLen, max: maxLen }), null);
          }
          const bigArr = new Array(maxLen + 1).fill(1);
          assert.notEqual(validateArray(bigArr, 'Lista', { min: minLen, max: maxLen }), null);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// ─── 10. calcDescuentoGlobal — invariantes del helper extraído ────────────────
describe('PBT: calcDescuentoGlobal — acotamiento y no negatividad', () => {
  it('el resultado es siempre >= 0', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('porcentaje', 'fijo', 'ninguno'),
        fc.double({ min: 0, max: 10000, noNaN: true }),
        nonNegativeFloat,
        (tipo, valor, baseNeta) => {
          const r = calcDescuentoGlobal(tipo, round2(baseNeta), round2(valor));
          assert.ok(r >= 0, `calcDescuentoGlobal('${tipo}', ${baseNeta}, ${valor}) = ${r} < 0`);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('el resultado nunca supera la base neta', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('porcentaje', 'fijo', 'ninguno'),
        fc.double({ min: 0, max: 10000, noNaN: true }),
        nonNegativeFloat,
        (tipo, valor, baseNetaRaw) => {
          const base = round2(baseNetaRaw);
          const r = calcDescuentoGlobal(tipo, valor, base);
          assert.ok(r <= base + 0.005, `calcDescuentoGlobal('${tipo}', ${valor}, ${base}) = ${r} > base`);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('tipo "ninguno" siempre retorna 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10000, noNaN: true }),
        nonNegativeFloat,
        (valor, baseNeta) => {
          assert.equal(calcDescuentoGlobal('ninguno', valor, round2(baseNeta)), 0);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('porcentaje 100 retorna exactamente la base neta', () => {
    fc.assert(
      fc.property(nonNegativeFloat, (baseNetaRaw) => {
        const base = round2(baseNetaRaw);
        assert.equal(calcDescuentoGlobal('porcentaje', 100, base), base);
      }),
      { numRuns: 500 },
    );
  });
});

// ─── 11. distributeGlobalDiscount — suma exacta e invariante de distribución ──
describe('PBT: distributeGlobalDiscount — suma exacta', () => {
  it('sum(resultado) === descGlobalAmount exactamente', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 10000, noNaN: true }), { minLength: 1, maxLength: 20 }),
        fc.double({ min: 0, max: 5000, noNaN: true }),
        (netasRaw, descRaw) => {
          const netas = netasRaw.map(round2);
          const desc = round2(descRaw);
          const resultado = distributeGlobalDiscount(netas, desc);
          const suma = round2(resultado.reduce((acc, d) => acc + d, 0));
          assert.equal(suma, desc, `suma=${suma} !== desc=${desc}`);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('cada elemento del resultado es >= 0', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 10000, noNaN: true }), { minLength: 1, maxLength: 20 }),
        fc.double({ min: 0, max: 5000, noNaN: true }),
        (netasRaw, descRaw) => {
          const netas = netasRaw.map(round2);
          const desc = round2(descRaw);
          const resultado = distributeGlobalDiscount(netas, desc);
          assert.ok(resultado.every((d) => d >= 0), `Hay un descuento negativo: ${resultado}`);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('la longitud del resultado iguala la cantidad de líneas', () => {
    fc.assert(
      fc.property(
        fc.array(nonNegativeFloat, { minLength: 1, maxLength: 50 }),
        nonNegativeFloat,
        (netas, desc) => {
          assert.equal(distributeGlobalDiscount(netas, desc).length, netas.length);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('descuento 0 distribuye todos ceros', () => {
    fc.assert(
      fc.property(
        fc.array(nonNegativeFloat, { minLength: 1, maxLength: 20 }),
        (netas) => {
          const resultado = distributeGlobalDiscount(netas, 0);
          assert.ok(resultado.every((d) => d === 0), `Hay un no-cero: ${resultado}`);
        },
      ),
      { numRuns: 500 },
    );
  });
});
