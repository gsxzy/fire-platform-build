import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Test createAlarm by running a small node script
script = '''
const { pool } = require('./utils/db');
const { initAlarmService, createAlarm } = require('./services/alarm.service');

async function test() {
  initAlarmService(pool);
  console.log('pool initialized:', !!pool);
  const result = await createAlarm({
    deviceId: 'TEST001',
    deviceName: 'Test Device',
    protocol: 'fscn8001',
    alarmType: 'fire',
    alarmLevel: 4,
    description: 'Test alarm',
    rawData: '4040...'
  });
  console.log('createAlarm result:', JSON.stringify(result));
}

test().catch(e => console.error('Error:', e.message));
'''

stdin, stdout, stderr = client.exec_command(f"cd /opt/my-fire-api && node -e \"{script}\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
err = stderr.read().decode('utf-8', errors='replace').strip()
print('OUT:', out)
if err: print('ERR:', err)

client.close()
