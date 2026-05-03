const path = require('path');
const dbPath = path.join(__dirname, 'utils', 'db');
console.log('Loading db from:', dbPath);
const { pool } = require(dbPath);
(async () => {
  try {
    console.log('DB loaded');
    const [[unitStats]] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN type = 'general' THEN 1 ELSE 0 END) as general, SUM(CASE WHEN type = 'key' THEN 1 ELSE 0 END) as keyUnit, SUM(CASE WHEN type = 'nine-small' THEN 1 ELSE 0 END) as nineSmall FROM units WHERE status = 1");
    console.log('unitStats:', JSON.stringify(unitStats));
    const [[deviceStats]] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal, SUM(CASE WHEN status = 'fault' THEN 1 ELSE 0 END) as fault, SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline FROM device_archive");
    console.log('deviceStats:', JSON.stringify(deviceStats));
    const [[alarmStats]] = await pool.query("SELECT COUNT(*) as total30d, SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as unresolved FROM fire_alarm WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    console.log('alarmStats:', JSON.stringify(alarmStats));
  } catch(e) { console.error('ERR:', e.message, e.stack); }
  process.exit(0);
})();
