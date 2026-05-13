const fs = require('fs');
const path = require('path');

const dirPath = 'D:\\repos\\ferco-posta\\backend\\src\\services';
try {
  fs.mkdirSync(dirPath, { recursive: true });
  console.log('Directory created successfully:', dirPath);
} catch (err) {
  console.error('Failed to create directory:', err.message);
  process.exit(1);
}
