/**
 * cfeSender.js — Envío del JSON CFE al módulo Dynamica (DGI)
 *
 * Actualmente NO se llama desde ningún lugar.
 * Para activar el envío real, llamar a sendCFE(ventaId) desde la ruta correspondiente.
 *
 * Variables de entorno requeridas:
 *   CFE_API_URL   — URL base del módulo (ej: https://api.dynamica.com.uy/cfe)
 *   CFE_API_TOKEN — Token de autorización (ej: Bearer eyJ...)
 */

import { buildCFE } from './cfeBuilder.js';

const CFE_SEND_TIMEOUT_MS = 30_000;

export async function sendCFE(ventaId) {
  const apiUrl = process.env.CFE_API_URL;
  const apiToken = process.env.CFE_API_TOKEN;

  if (!apiUrl || !apiToken) {
    throw new Error('CFE_API_URL y CFE_API_TOKEN deben estar configurados en .env para enviar CFEs.');
  }

  let payload;
  try {
    payload = await buildCFE(ventaId);
  } catch (err) {
    throw new Error(`Error construyendo CFE para venta ${ventaId}: ${err.message}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CFE_SEND_TIMEOUT_MS);

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
      throw new Error(`Timeout enviando CFE: la API no respondió en ${CFE_SEND_TIMEOUT_MS / 1000}s`);
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
