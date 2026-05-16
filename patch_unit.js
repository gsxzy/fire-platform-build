const fs = require('fs');
const file = '/opt/my-fire-api-new/dist/controllers/unit.controller.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  'async create(req, res) {',
  "async create(req, res) { console.log('[DEBUG] Unit create called, body=', JSON.stringify(req.body));"
);
fs.writeFileSync(file, content);
console.log('patched');
