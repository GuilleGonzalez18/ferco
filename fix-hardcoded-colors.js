/**
 * Script para reemplazar colores hardcodeados con variables CSS.
 * Ejecutar con: node fix-hardcoded-colors.js
 */
const fs = require('fs');
const path = require('path');

const CSS_FILES = [
  'frontend/src/shared/components/menu/MenuVendedor.css',
  'frontend/src/features/ventas/Ventas.css',
  'frontend/src/features/ventas/VentasHistorial.css',
  'frontend/src/features/productos/Productos.css',
  'frontend/src/features/clientes/Clientes.css',
  'frontend/src/features/usuarios/Usuarios.css',
  'frontend/src/features/dashboard/Dashboard.css',
  'frontend/src/features/estadisticas/Estadisticas.css',
  'frontend/src/features/stock/ControlStock.css',
  'frontend/src/features/configuracion/Configuracion.css',
  'frontend/src/features/auditoria/Auditoria.css',
];

// Orden importa: primero los más específicos
const REPLACEMENTS = [
  ['#375f8c', 'var(--color-primary)'],
  ['#294c74', 'var(--color-primary-strong)'],
  ['#2f5279', 'var(--color-primary-strong)'],
  ['#e7effa', 'var(--color-primary-soft)'],
  ['#eaf0fa', 'var(--color-primary-soft)'],
  ['#1d2b3e', 'var(--color-text)'],
  ['#1f2933', 'var(--color-text)'],
  ['#526278', 'var(--color-text-muted)'],
  // Colores de menú
  ['#e6ecf4', 'var(--menu-text)'],
];

const base = path.join(__dirname);
let total = 0;

for (const rel of CSS_FILES) {
  const file = path.join(base, rel);
  if (!fs.existsSync(file)) {
    console.log(`SKIP (not found): ${rel}`);
    continue;
  }
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  for (const [from, to] of REPLACEMENTS) {
    content = content.split(from).join(to);
  }
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    let count = 0;
    for (const [from] of REPLACEMENTS) {
      const matches = original.match(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
      if (matches) count += matches.length;
    }
    console.log(`✓ ${rel} (${count} reemplazos)`);
    total++;
  } else {
    console.log(`  ${rel} (sin cambios)`);
  }
}
console.log(`\nListo. ${total} archivos actualizados.`);
