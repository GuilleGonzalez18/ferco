/**
 * validate.js — Utilidades de validación sin dependencias externas.
 *
 * Uso típico en un handler:
 *   const err = firstError(
 *     validateRequired(nombre, 'Nombre'),
 *     validateMaxLength(nombre, 255, 'Nombre'),
 *   );
 *   if (respondIfInvalid(res, err)) return;
 */

export const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
export const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
export const SAFE_IDENTIFIER_RE = /^[a-zA-Z0-9_\-]+$/;

/** Verifica formato de correo electrónico. */
export function validateEmail(value) {
  return EMAIL_RE.test(String(value || ''));
}

/** Campo obligatorio (no vacío tras trim). */
export function validateRequired(value, field) {
  const str = String(value ?? '').trim();
  if (!str) return `${field} es requerido`;
  return null;
}

/** Longitud máxima para strings. Null/undefined pasan OK. */
export function validateMaxLength(value, max, field) {
  if (value == null) return null;
  if (String(value).length > max) return `${field} no puede superar los ${max} caracteres`;
  return null;
}

/** Longitud mínima para strings. */
export function validateMinLength(value, min, field) {
  if (value == null || String(value).length < min) return `${field} debe tener al menos ${min} caracteres`;
  return null;
}

/** Entero positivo estricto. */
export function validatePositiveInt(value, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return `${field} debe ser un entero positivo`;
  return null;
}

/** Número finito con límites opcionales. */
export function validateNumber(value, field, { min, max, required = false } = {}) {
  if (value == null || value === '') {
    if (required) return `${field} es requerido`;
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return `${field} debe ser un número válido`;
  if (min !== undefined && n < min) return `${field} debe ser mayor o igual a ${min}`;
  if (max !== undefined && n > max) return `${field} debe ser menor o igual a ${max}`;
  return null;
}

/** Valor dentro de un conjunto permitido. Null/undefined pasan si no es required. */
export function validateEnum(value, allowed, field, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) return `${field} es requerido`;
    return null;
  }
  if (!allowed.includes(value)) return `${field} debe ser uno de: ${allowed.join(', ')}`;
  return null;
}

/** Boolean estricto (true o false). */
export function validateBoolean(value, field) {
  if (typeof value !== 'boolean') return `${field} debe ser verdadero o falso`;
  return null;
}

/** Color hexadecimal #RGB o #RRGGBB. Null/undefined pasan OK. */
export function validateHexColor(value, field) {
  if (value == null || value === '') return null;
  if (!HEX_COLOR_RE.test(String(value))) return `${field} debe ser un color hexadecimal válido (#RGB o #RRGGBB)`;
  return null;
}

/** Identificador seguro: solo letras, números, guiones y underscores. */
export function validateIdentifier(value, field) {
  if (value == null || value === '') return null;
  if (!SAFE_IDENTIFIER_RE.test(String(value))) return `${field} contiene caracteres no permitidos`;
  return null;
}

/** Formato de fecha YYYY-MM-DD. Null/undefined pasan OK. */
export function validateDateFormat(value, field) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return `${field} debe ser una fecha válida`;
  return null;
}

/**
 * Tamaño máximo para strings base64 (imágenes, archivos).
 * maxBytes: tamaño máximo en bytes del dato original (base64 ~ 4/3 del original).
 */
export function validateBase64Size(value, maxBytes, field) {
  if (value == null || value === '') return null;
  const approxBytes = String(value).length * 0.75;
  if (approxBytes > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(0);
    return `${field} supera el tamaño máximo permitido (${maxMB} MB)`;
  }
  return null;
}

/** Array: verifica tipo, tamaño mínimo y máximo. */
export function validateArray(value, field, { min = 1, max = 500 } = {}) {
  if (!Array.isArray(value)) return `${field} debe ser una lista`;
  if (value.length < min) return `${field} debe tener al menos ${min} elemento(s)`;
  if (value.length > max) return `${field} no puede tener más de ${max} elemento(s)`;
  return null;
}

/**
 * Retorna el primer error no-null de la lista.
 * Uso: firstError(validatorA, validatorB, ...)
 */
export function firstError(...errors) {
  for (const e of errors) {
    if (e) return e;
  }
  return null;
}

/**
 * Envía 400 si hay un error de validación.
 * Retorna true si se envió la respuesta (para hacer `return`).
 *
 * Uso:
 *   if (respondIfInvalid(res, firstError(...))) return;
 */
export function respondIfInvalid(res, errorMessage) {
  if (errorMessage) {
    res.status(400).json({ error: errorMessage });
    return true;
  }
  return false;
}
