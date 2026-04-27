const fs = require('fs');

// First, create the directory
const dir = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\configuracion';

// Create directories recursively
const parts = dir.split('\\');
let current = '';

for (let part of parts) {
  if (part === '') continue;
  current = current ? current + '\\' + part : part;
  if (!fs.existsSync(current)) {
    try {
      fs.mkdirSync(current);
    } catch (e) {
      // Directory might already exist
    }
  }
}

// Now read the source files and write them to the new location
const jsxSource = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\dashboard\\Configuracion.jsx';
const cssSource = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\dashboard\\Configuracion.css';

const jsxDest = dir + '\\Configuracion.jsx';
const cssDest = dir + '\\Configuracion.css';

try {
  // Copy JSX
  if (fs.existsSync(jsxSource)) {
    const content = fs.readFileSync(jsxSource, 'utf-8');
    fs.writeFileSync(jsxDest, content);
    console.log('✓ Created: ' + jsxDest);
  }
  
  // Copy CSS
  if (fs.existsSync(cssSource)) {
    const content = fs.readFileSync(cssSource, 'utf-8');
    fs.writeFileSync(cssDest, content);
    console.log('✓ Created: ' + cssDest);
  }
  
  // Verify
  console.log('\n✓ Directory listing:');
  const files = fs.readdirSync(dir);
  files.forEach(f => console.log('  - ' + f));
  
  console.log('\n✓ Setup complete!');
} catch (err) {
  console.error('Error:', err.message);
}
