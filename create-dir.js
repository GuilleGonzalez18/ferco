const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'backend', 'src', 'services');

try {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`Directory created or already exists: ${targetDir}`);
} catch (err) {
  console.error(`Error creating directory: ${err.message}`);
  process.exit(1);
}
