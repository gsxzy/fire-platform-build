import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Test direct SQL insert
script = '''
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
    console.error('Error type:', typeof err);
    console.error('Error keys:', Object.keys(err));
    console.error('Error:', err);
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    console.error('SQLState:', err.sqlState);
  }
}

test().catch(e => console.error('Outer:', e));
'''

stdin, stdout, stderr = client.exec_command(f"cd /opt/my-fire-api && node -e \"{script}\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
err = stderr.read().decode('utf-8', errors='replace').strip()
print('OUT:', out)
if err: print('ERR:', err)

client.close()
