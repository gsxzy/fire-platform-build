const fs = require('fs');

// Fix fscn8001.server.ts - add insertRawLog import
const fscnPath = 'backend/src/protocols/fscn8001.server.ts';
let fscnContent = fs.readFileSync(fscnPath, 'utf8');
fscnContent = fscnContent.replace(
  "import { AlarmService } from '@/services/alarm.service';",
  "import { AlarmService } from '@/services/alarm.service';\nimport { insertRawLog } from '@/services/tdengine.service';"
);
fs.writeFileSync(fscnPath, fscnContent);
console.log('Fixed fscn8001.server.ts');

// Verify
const verify = fs.readFileSync(fscnPath, 'utf8');
if (verify.includes("import { insertRawLog } from '@/services/tdengine.service';")) {
  console.log('Verified: insertRawLog import added');
} else {
  console.error('ERROR: insertRawLog import NOT found');
}
