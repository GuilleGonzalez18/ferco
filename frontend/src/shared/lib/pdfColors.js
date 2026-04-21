/**
 * Utilidades para leer los colores de las CSS variables en tiempo de ejecución
 * y convertirlos al formato que requiere jsPDF ([r, g, b]).
 */

/**
 * Convierte un color hex (#rrggbb o #rgb) a array [r, g, b].
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function hexToRgb(hex) {
  const clean = hex.trim().replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Lee el valor de una CSS variable del :root y lo convierte a RGB.
 * Fallback a [55, 95, 140] (azul por defecto) si no se puede leer.
 * @param {string} varName  p.ej. '--color-primary'
 * @returns {[number, number, number]}
 */
export function cssVarToRgb(varName, fallback = [55, 95, 140]) {
  try {
    const hex = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
    if (hex && hex.startsWith('#')) {
      return hexToRgb(hex);
    }
  } catch (_) { /* noop */ }
  return fallback;
}

/** Devuelve el color primario configurado como [r, g, b] para jsPDF. */
export function getPrimaryRgb() {
  return cssVarToRgb('--color-primary', [55, 95, 140]);
}
