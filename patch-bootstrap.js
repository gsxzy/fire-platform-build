const fs = require('fs');
const p = '/opt/my-fire-api-new/dist/app.js';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(
  'logger_1.default.error("[Bootstrap] Failed:", err.message);',
  'logger_1.default.error("[Bootstrap] Failed:", err.message || err); console.error("[Bootstrap] RAW ERROR:", err);'
);
fs.writeFileSync(p, c);
console.log('patched');
