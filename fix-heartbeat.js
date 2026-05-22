const fs = require('fs');
const p = 'backend/src/services/deviceHeartbeat.service.ts';
let c = fs.readFileSync(p, 'utf-8');
c = c.replace(/fire_device_heartbeat/g, 'fire_heartbeat');
fs.writeFileSync(p, c, 'utf-8');
console.log('Fixed heartbeat table name');
