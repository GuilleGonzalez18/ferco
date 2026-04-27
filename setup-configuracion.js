const fs = require('fs');
const path = require('path');

// Create the configuracion directory
const configDir = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\configuracion';
fs.mkdirSync(configDir, { recursive: true });

// Move/copy the files to the correct location
const sourceJsx = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\dashboard\\Configuracion.jsx';
const sourceCss = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\dashboard\\Configuracion.css';
const destJsx = path.join(configDir, 'Configuracion.jsx');
const destCss = path.join(configDir, 'Configuracion.css');

if (fs.existsSync(sourceJsx)) {
  const jsxContent = fs.readFileSync(sourceJsx, 'utf8');
  fs.writeFileSync(destJsx, jsxContent);
  console.log('✓ Configuracion.jsx created in:', configDir);
}

if (fs.existsSync(sourceCss)) {
  const cssContent = fs.readFileSync(sourceCss, 'utf8');
  fs.writeFileSync(destCss, cssContent);
  console.log('✓ Configuracion.css created in:', configDir);
}

console.log('\n✓ All files created successfully!');
console.log('Files location:', configDir);

// List files in the directory
const files = fs.readdirSync(configDir);
console.log('\nFiles in directory:');
files.forEach(f => console.log('  -', f));
