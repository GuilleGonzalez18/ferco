/**
 * Defaults y helpers para la configuración de documentos PDF por tipo.
 * Cada tipo (factura, remito) tiene su propia config independiente.
 */

// Campos de empresa visibles en el encabezado del documento
const EMPRESA_FIELDS_DEFAULTS = {
  mostrarRazonSocial: true,
  mostrarRut:         true,
  mostrarDireccion:   true,
  mostrarTelefono:    true,
  mostrarEmail:       true,
};

// Campos del cliente visibles en el documento
const CLIENTE_FIELDS_DEFAULTS = {
  mostrarClienteNombre:    true,
  mostrarClienteTelefono:  true,
  mostrarClienteDireccion: true,
  mostrarClienteHorarios:  true,
};

export const PDF_DEFAULTS_FACTURA = {
  ...EMPRESA_FIELDS_DEFAULTS,
  ...CLIENTE_FIELDS_DEFAULTS,
  piePagina:    '',
  notas:        '',
  fontFamily:   'helvetica',
  fontSizeBase: 10,
  logoTamano:   40,   // mm en el PDF
  logoPosicion: 'izquierda', // 'izquierda' | 'derecha' | 'centro' | 'cabecera'
  mostrarIva:   false,
};

export const PDF_DEFAULTS_REMITO = {
  ...EMPRESA_FIELDS_DEFAULTS,
  ...CLIENTE_FIELDS_DEFAULTS,
  piePagina:    '',
  notas:        '',
  fontFamily:   'helvetica',
  fontSizeBase: 10,
  logoTamano:   40,   // mm en el PDF
  logoPosicion: 'izquierda', // 'izquierda' | 'derecha' | 'centro' | 'cabecera'
  mostrarCosto: false,
};

const DEFAULTS_BY_TIPO = {
  factura: PDF_DEFAULTS_FACTURA,
  remito:  PDF_DEFAULTS_REMITO,
};

/**
 * Mergea la config guardada (rawConfig) sobre los defaults del tipo indicado.
 * @param {'factura'|'remito'} tipo
 * @param {object|null|undefined} rawConfig
 * @returns {object}
 */
export function getPdfConfig(tipo, rawConfig) {
  const defaults = DEFAULTS_BY_TIPO[tipo] || PDF_DEFAULTS_FACTURA;
  return { ...defaults, ...(rawConfig || {}) };
}
