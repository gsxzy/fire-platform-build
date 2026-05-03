require('dotenv').config();
const db = require('./utils/db');
const alarmSvc = require('./services/alarm.service');

async function test() {
  console.log('pool ok:', !!db.pool);
  alarmSvc.initAlarmService(db.pool);
  
  // Direct SQL test
  try {
    const [rows] = await db.pool.query('SELECT COUNT(*) as cnt FROM fire_alarm');
    console.log('fire_alarm count:', rows[0].cnt);
  } catch (e) {
    console.error('Query err:', e.code, e.message);
  }
  
  // Test createAlarm
  try {
    const r = await alarmSvc.createAlarm({
      deviceId: 'TEST001', deviceName: 'Test', protocol: 'fscn8001',
      alarmType: 'fire', alarmLevel: 4, description: 'Test'
    });
    console.log('createAlarm result:', r ? JSON.stringify(r) : 'null');
  } catch (e) {
    console.error('createAlarm err:', e.code, e.message);
  }
}

test().then(() => process.exit(0)).catch(e => { console.error('Fatal:', e); process.exit(1); });
