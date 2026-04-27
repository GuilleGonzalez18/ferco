const fs = require('fs');
const path = require('path');

// Helper to ensure directory exists
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

// Create the configuracion directory
const configDir = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\configuracion';

try {
  // Create directory
  if (!fs.existsSync(configDir)) {
    ensureDirectoryExistence(configDir + '\\');
    fs.mkdirSync(configDir, { recursive: true });
    console.log('[✓] Created configuracion directory');
  }

  // Copy Configuracion.jsx
  const jsxSourcePath = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\dashboard\\Configuracion.jsx';
  const jsxTargetPath = path.join(configDir, 'Configuracion.jsx');
  
  if (fs.existsSync(jsxSourcePath)) {
    const jsxContent = fs.readFileSync(jsxSourcePath, 'utf8');
    fs.writeFileSync(jsxTargetPath, jsxContent);
    console.log('[✓] Copied Configuracion.jsx');
  } else {
    console.log('[!] Source file not found:', jsxSourcePath);
  }

  // Copy Configuracion.css
  const cssSourcePath = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\dashboard\\Configuracion.css';
  const cssTargetPath = path.join(configDir, 'Configuracion.css');
  
  if (fs.existsSync(cssSourcePath)) {
    const cssContent = fs.readFileSync(cssSourcePath, 'utf8');
    fs.writeFileSync(cssTargetPath, cssContent);
    console.log('[✓] Copied Configuracion.css');
  } else {
    console.log('[!] Source file not found:', cssSourcePath);
  }

  // Verify files exist
  const filesCreated = fs.readdirSync(configDir);
  console.log('\n[✓] Setup completed successfully!');
  console.log('Directory:', configDir);
  console.log('Files created:');
  filesCreated.forEach(f => console.log('  - ' + f));

} catch (error) {
  console.error('[ERROR]', error.message);
  process.exit(1);
}
