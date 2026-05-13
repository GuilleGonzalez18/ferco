const fs = require('fs');
const path = require('path');
const dir = path.join('D:/repos/ferco-posta/backend/src/services');
if (!fs.existsSync(dir)) { fs.mkdirSync(dir, {recursive: true}); }
console.log('dir exists:', fs.existsSync(dir));
