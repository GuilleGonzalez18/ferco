/* global require, __dirname */
const fs = require('fs');
const path = require('path');

// Create the configuracion directory
const configDir = path.join(__dirname, 'configuracion');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
  console.log('[setup] Created configuracion directory');
}

// Copy Configuracion.jsx
const jsxSourcePath = path.join(__dirname, 'dashboard', 'Configuracion.jsx');
const jsxTargetPath = path.join(configDir, 'Configuracion.jsx');
if (fs.existsSync(jsxSourcePath) && !fs.existsSync(jsxTargetPath)) {
  const jsxContent = fs.readFileSync(jsxSourcePath, 'utf8');
  fs.writeFileSync(jsxTargetPath, jsxContent);
  console.log('[setup] Copied Configuracion.jsx');
}

// Copy Configuracion.css
const cssSourcePath = path.join(__dirname, 'dashboard', 'Configuracion.css');
const cssTargetPath = path.join(configDir, 'Configuracion.css');
if (fs.existsSync(cssSourcePath) && !fs.existsSync(cssTargetPath)) {
  const cssContent = fs.readFileSync(cssSourcePath, 'utf8');
  fs.writeFileSync(cssTargetPath, cssContent);
  console.log('[setup] Copied Configuracion.css');
}

// Verify files exist
const filesCreated = fs.readdirSync(configDir);
console.log('[setup] Files in configuracion directory:', filesCreated);
