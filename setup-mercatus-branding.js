/**
 * Script de setup de branding Mercatus.
 * Copia el logo al directorio public del frontend.
 * Ejecutar desde la raíz: node setup-mercatus-branding.js
 */
const fs = require('fs');
const path = require('path');

const SRC_LOGO = path.join(
  process.env.APPDATA || '',
  'Code/User/globalStorage/github.copilot-chat/copilot-cli-images/1776865407351-0i2yjn4d.png'
);

const PUBLIC = path.join(__dirname, 'frontend/public');
const DEST_LOGO    = path.join(PUBLIC, 'mercatus-logo.png');
const DEST_FAVICON = path.join(PUBLIC, 'favicon.png');

if (!fs.existsSync(SRC_LOGO)) {
  console.error('No se encontró el logo en:', SRC_LOGO);
  console.error('Copiá manualmente el logo a:');
  console.error(' → frontend/public/mercatus-logo.png');
  console.error(' → frontend/public/favicon.png');
  process.exit(1);
}

fs.copyFileSync(SRC_LOGO, DEST_LOGO);
fs.copyFileSync(SRC_LOGO, DEST_FAVICON);

console.log('✓ Logo copiado a frontend/public/mercatus-logo.png');
console.log('✓ Favicon copiado a frontend/public/favicon.png');
