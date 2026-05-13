/**
 * cfeSender.js — Envío del JSON CFE al módulo Dynamica (DGI)
 *
 * Variables de entorno:
 *   CFE_HABILITADO       — 'true' para habilitar envío (master switch)
 *   CFE_TIMEOUT_MS       — timeout en ms (default 20000)
 *
 *   Ambiente LOCAL:
 *     CFE_API_URL, CFE_API_TOKEN
 *   Ambiente PRUEBAS:
 *     CFE_PRUEBAS_URL, CFE_PRUEBAS_TOKEN
 *   Ambiente PRODUCCION:
 *     CFE_PRODUCCION_URL, CFE_PRODUCCION_TOKEN
 */

import { buildCFE } from './cfeBuilder.js';

/**
 * Construye la configuración de envío CFE según el ambiente de la empresa.
 * Retorna null si CFE_HABILITADO !== 'true' o si faltan credenciales.
 * @param {{ cfe_ambiente?: string }} empresa
 * @returns {{ url: string, token: string, timeoutMs: number } | null}
 */
export function buildCfeConfig(empresa) {
  if (process.env.CFE_HABILITADO !== 'true') return null;
  const ambiente = (empresa?.cfe_ambiente || 'LOCAL').toUpperCase();
  const parsedTimeout = parseInt(process.env.CFE_TIMEOUT_MS, 10);
  const timeoutMs = Math.max(1000, Number.isFinite(parsedTimeout) ? parsedTimeout : 20000);

  let url, token;
  if (ambiente === 'PRODUCCION') {
    url   = process.env.CFE_PRODUCCION_URL;
    token = process.env.CFE_PRODUCCION_TOKEN;
  } else if (ambiente === 'PRUEBAS') {
    url   = process.env.CFE_PRUEBAS_URL;
    token = process.env.CFE_PRUEBAS_TOKEN;
  } else {
    // LOCAL — usa las vars legacy CFE_API_URL / CFE_API_TOKEN
    url   = process.env.CFE_API_URL;
    token = process.env.CFE_API_TOKEN;
  }

  if (!url || !token) return null;
  return { url, token, timeoutMs };
}

/**
 * Envía el CFE de la venta al endpoint configurado.
 * @param {number} ventaId
 * @param {{ url: string, token: string, timeoutMs: number } | null} [config]
 *   Si no se pasa, lee las variables de entorno legacy (CFE_API_URL / CFE_API_TOKEN).
 */
export async function sendCFE(ventaId, config = null) {
  const apiUrl    = config?.url   ?? process.env.CFE_API_URL;
  const apiToken  = config?.token ?? process.env.CFE_API_TOKEN;
  const timeoutMs = config?.timeoutMs ?? parseInt(process.env.CFE_TIMEOUT_MS || '20000', 10);

  if (!apiUrl || !apiToken) {
    throw new Error('El envío de CFE no está configurado para este ambiente.');
  }

  let payload;
  try {
    payload = await buildCFE(ventaId);
  } catch (err) {
    throw new Error(`Error construyendo CFE para venta ${ventaId}: ${err.message}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Timeout enviando CFE: la API no respondió en ${timeoutMs / 1000}s`);
    }
    throw new Error(`Error de red enviando CFE: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Error al enviar CFE (HTTP ${response.status}): ${errorText}`);
  }

  return response.json();
}
