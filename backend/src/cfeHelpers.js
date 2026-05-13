/**
 * cfeHelpers.js — Funciones puras para la generación de CFE.
 * Sin dependencias externas ni acceso a la base de datos.
 */

export function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function round4(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

/**
 * Calcula el descuento global a partir del tipo/valor y la base neta de ítems.
 * @param {'ninguno'|'porcentaje'|'fijo'} tipo
 * @param {number} valor
 * @param {number} baseNeta  suma de (monto - descuento_item) de todas las líneas
 * @returns {number} monto total de descuento global (>= 0)
 */
export function calcDescuentoGlobal(tipo, valor, baseNeta) {
  if (tipo === 'porcentaje' && valor > 0) {
    const pct = Math.max(0, Math.min(100, valor));
    return round2((baseNeta * pct) / 100);
  }
  if (tipo === 'fijo' && valor > 0) {
    return round2(Math.max(0, Math.min(baseNeta, valor)));
  }
  return 0;
}

/**
 * Distribuye el descuento global entre líneas de forma proporcional a su peso neto.
 * Usa "budget tracking" para garantizar que ningún ítem sea negativo y que la suma
 * exacta sea igual a descGlobalAmount.
 *
 * Invariante: sum(resultado) === descGlobalAmount, resultado[i] >= 0
 *
 * @param {number[]} netasLinea  arreglo de montos netos por línea (>= 0)
 * @param {number}   descGlobalAmount  descuento total a distribuir
 * @returns {number[]}  descuento asignado a cada línea (misma longitud que netasLinea)
 */
export function distributeGlobalDiscount(netasLinea, descGlobalAmount) {
  const baseNeta = round2(netasLinea.reduce((acc, n) => acc + n, 0));
  let remaining = descGlobalAmount;
  return netasLinea.map((neta, i) => {
    if (i === netasLinea.length - 1) {
      return round2(Math.max(0, remaining));
    }
    const prop = baseNeta > 0 ? round2(descGlobalAmount * neta / baseNeta) : 0;
    const linea = round2(Math.min(prop, Math.max(0, remaining)));
    remaining = round2(remaining - linea);
    return linea;
  });
}

/**
 * Formatea una fecha a YYYY-MM-DD en hora local.
 * Retorna null si el valor es inválido.
 */
export function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

/**
 * Formatea una fecha a 'YYYY-MM-DD HH:mm:ss' en hora local.
 * Retorna null si el valor es inválido.
 */
export function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const tzOffset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - tzOffset);
  return local.toISOString().slice(0, 19).replace('T', ' ');
}

/** IteIndFact según codigo de tipos_iva: 2 → 2 (mín), 3 → 3 (básica), resto → 1 */
export function getIteIndFact(ivaCodigo) {
  const c = Number(ivaCodigo);
  if (c === 2) return 2;
  if (c === 3) return 3;
  return 1;
}

/** Forma de pago CFE: 'credito' → '2', resto → '1' */
export function getFmaPago(medioPago) {
  return String(medioPago || '').toLowerCase() === 'credito' ? '2' : '1';
}

/** Glosa legible del medio de pago. */
export function getGlosaMP(medioPago) {
  const m = String(medioPago || '').toLowerCase();
  if (m === 'credito') return 'CRÉDITO';
  if (m === 'debito') return 'DÉBITO';
  if (m === 'transferencia') return 'TRANSFERENCIA';
  return 'EFECTIVO';
}

/** Código de medio de pago DGI: efectivo=1, crédito=2, débito=3, transferencia=4 */
export function getCodMP(medioPago) {
  const m = String(medioPago || '').toLowerCase();
  if (m === 'credito') return '2';
  if (m === 'debito') return '3';
  if (m === 'transferencia') return '4';
  return '1';
}

/**
 * Código numérico de tipo de documento receptor.
 * RUT=2, CI=3, PASAPORTE=5, DNI=6, OTRO=4, vacío=null
 */
export function getRcpTipoDoc(tipoDoc) {
  const t = String(tipoDoc || '').toUpperCase();
  if (t === 'RUT') return 2;
  if (t === 'CI') return 3;
  if (t === 'PASAPORTE') return 5;
  if (t === 'DNI') return 6;
  if (t) return 4;
  return null;
}

/**
 * Determina el tipo de CFE: cliente con RUT → eFactura (111), resto → eTicket (101).
 */
export function getCFETipo(cliente) {
  if (
    cliente &&
    String(cliente.tipo_documento || '').toUpperCase() === 'RUT' &&
    cliente.numero_documento
  ) {
    return '111';
  }
  return '101';
}

/** Valida que el RUT tenga entre 9 y 12 dígitos numéricos. */
export function validateRut(numeroDocumento) {
  const digits = String(numeroDocumento || '').replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 12;
}

/** Retorna código de unidad de medida (máx 4 chars, uppercase). Fallback: 'UNID'. */
export function getUniMed(unidad) {
  const u = String(unidad || '').toUpperCase().slice(0, 4).trim();
  return u || 'UNID';
}

/** Detecta el tipo de código de barras a partir del EAN. */
export function getCodiTpoCod(ean) {
  if (!ean) return 'INT1';
  const len = String(ean).replace(/\D/g, '').length;
  if (len === 13) return 'GTIN13';
  if (len === 12) return 'GTIN12';
  if (len === 8) return 'GTIN8';
  return 'INT1';
}
