const fs = require('fs');
const path = require('path');
const d = 'backend/src/models';
let hasName = false;
for (const f of fs.readdirSync(d).filter(x => x.endsWith('.ts'))) {
  const c = fs.readFileSync(path.join(d, f), 'utf8');
  if (c.includes("name: 'idx_")) {
    console.log('STILL HAS NAME:', f);
    hasName = true;
  }
}
if (!hasName) console.log('All index names removed successfully');
