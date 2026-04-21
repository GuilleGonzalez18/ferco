const fs = require('fs');
const path = require('path');

// Define paths
const sourceDir = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\dashboard';
const targetDir = 'D:\\repos\\ferco-posta\\frontend\\src\\features\\configuracion';
const jsSourceFile = path.join(sourceDir, 'Configuracion.jsx');
const cssSourceFile = path.join(sourceDir, 'Configuracion.css');
const jsTargetFile = path.join(targetDir, 'Configuracion.jsx');
const cssTargetFile = path.join(targetDir, 'Configuracion.css');

try {
  // 1. Create the directory
  console.log('1. Creating directory:', targetDir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log('   ✓ Directory created successfully');
  } else {
    console.log('   ✓ Directory already exists');
  }

  // 2 & 3. Read and write Configuracion.jsx
  console.log('\n2. Reading file:', jsSourceFile);
  const jsContent = fs.readFileSync(jsSourceFile, 'utf8');
  console.log('   ✓ File read successfully (' + jsContent.length + ' bytes)');
  
  console.log('\n3. Writing to:', jsTargetFile);
  fs.writeFileSync(jsTargetFile, jsContent, 'utf8');
  console.log('   ✓ File written successfully');

  // 4 & 5. Read and write Configuracion.css
  console.log('\n4. Reading file:', cssSourceFile);
  const cssContent = fs.readFileSync(cssSourceFile, 'utf8');
  console.log('   ✓ File read successfully (' + cssContent.length + ' bytes)');
  
  console.log('\n5. Writing to:', cssTargetFile);
  fs.writeFileSync(cssTargetFile, cssContent, 'utf8');
  console.log('   ✓ File written successfully');

  // 6. Verify both files exist
  console.log('\n6. Verifying files exist:');
  const jsExists = fs.existsSync(jsTargetFile);
  const cssExists = fs.existsSync(cssTargetFile);
  console.log('   Configuracion.jsx exists:', jsExists);
  console.log('   Configuracion.css exists:', cssExists);

  // List directory contents
  console.log('\nDirectory contents of:', targetDir);
  const files = fs.readdirSync(targetDir);
  files.forEach(file => {
    const filePath = path.join(targetDir, file);
    const stats = fs.statSync(filePath);
    console.log('   -', file, '(' + stats.size + ' bytes)');
  });

  console.log('\n✓ All operations completed successfully!');
} catch (error) {
  console.error('✗ Error:', error.message);
  process.exit(1);
}
