const { pool } = require('./utils/db');

async function test() {
  try {
    const [result] = await pool.execute(
      `INSERT INTO fire_alarm (alarm_no, device_id, device_name, protocol, unit_id, unit_name, alarm_type, alarm_level, alarm_status, location, description, raw_data, loop_no, address, host_code, trigger_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, NOW())`,
      ['ALM-TEST-001', 'TEST001', 'Test Device', 'fscn8001', 'PENDING', '待分配单位', 'fire', 4, null, 'Test alarm', '4040...', null, null, null]
    );
    console.log('Insert OK, id:', result.insertId);
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Code:', err.code);
    console.error('SQLState:', err.sqlState);
    console.error('Full:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
  }
}

test().catch(e => console.error('Outer:', e.message));
