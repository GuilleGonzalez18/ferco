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

/**
 * Detecta el formato de imagen para jsPDF a partir de una URL o base64.
 * @param {string} url
 * @returns {'PNG'|'JPEG'|'WEBP'}
 */
export function detectImageFormat(url) {
  const value = String(url || '').toLowerCase();
  if (value.startsWith('data:image/jpeg') || value.startsWith('data:image/jpg') || value.includes('.jpg') || value.includes('.jpeg')) return 'JPEG';
  if (value.startsWith('data:image/webp')) return 'WEBP';
  return 'PNG';
}

/**
 * Dibuja un rectángulo de fondo del color `logoBgColor` antes del logo,
 * para evitar el fondo negro en PNGs con transparencia al exportar con jsPDF.
 * @param {import('jspdf').jsPDF} doc
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} [logoBgColor='#ffffff']
 */
export function fillLogoBg(doc, x, y, w, h, logoBgColor = '#ffffff') {
  try {
    const [r, g, b] = hexToRgb(logoBgColor || '#ffffff');
    doc.setFillColor(r, g, b);
    doc.rect(x, y, w, h, 'F');
  } catch (_) {
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, w, h, 'F');
  }
}

/**
 * Carga una imagen para jsPDF aplanada sobre un canvas con el color de fondo
 * indicado. Esto elimina la transparencia PNG (que jsPDF renderiza como negro).
 * Retorna un data URL JPEG listo para usar con doc.addImage(..., 'JPEG', ...).
 * @param {string|null} logoBase64
 * @param {string} [bgColor='#ffffff']
 * @returns {Promise<{ dataUrl: string; naturalWidth: number; naturalHeight: number } | null>}
 */
export function loadLogoForPdf(logoBase64, bgColor = '#ffffff') {
  return new Promise((resolve) => {
    const src = logoBase64 || '/mercatus-logo.png';

    const flatten = (img) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth  || img.width  || 200;
        canvas.height = img.naturalHeight || img.height || 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.95),
          naturalWidth:  canvas.width,
          naturalHeight: canvas.height,
        });
      } catch (_) {
        resolve(null);
      }
    };

    const img = new Image();
    img.onload = () => flatten(img);
    img.onerror = () => {
      if (src !== '/mercatus-logo.png') {
        const fallback = new Image();
        fallback.onload  = () => flatten(fallback);
        fallback.onerror = () => resolve(null);
        fallback.src = '/mercatus-logo.png';
      } else {
        resolve(null);
      }
    };
    if (!logoBase64) {
      img.src = src;
    } else {
      img.src = src;
    }
  });
}
