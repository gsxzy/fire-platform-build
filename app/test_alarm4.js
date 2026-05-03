require('dotenv').config();
const { pool } = require('./utils/db');
const { initAlarmService, createAlarm } = require('./services/alarm.service');

async function test() {
  console.log('DB_SOCKET_PATH:', process.env.DB_SOCKET_PATH);
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_PORT:', process.env.DB_PORT);
  console.log('pool type:', typeof pool);
  
  initAlarmService(pool);
  console.log('initAlarmService called');
  
  try {
    const result = await createAlarm({
      deviceId: 'TEST001',
      deviceName: 'Test Device',
      protocol: 'fscn8001',
      alarmType: 'fire',
      alarmLevel: 4,
      description: 'Test alarm',
      rawData: '4040...'
    });
    console.log('Result:', JSON.stringify(result));
  } catch (err) {
    console.error('Error:', err);
    console.error('Message:', err.message);
    console.error('Code:', err.code);
  }
}

test().catch(e => console.error('Outer:', e));
