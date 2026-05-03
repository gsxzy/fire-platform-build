import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

try:
    # Check pm2 log files
    stdin, stdout, stderr = client.exec_command('cat /root/.pm2/logs/fire-api-out.log | tail -n 30')
    out = stdout.read().decode('utf-8', errors='replace').strip()
    print("OUT LOG tail:")
    print(out[-2000:])
    print("---")
    
    # Direct node test for the route
    test_code = """
const { pool } = require('/opt/my-fire-api/utils/db');
(async () => {
  try {
    const [[unitStats]] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN type = 'general' THEN 1 ELSE 0 END) as general, SUM(CASE WHEN type = 'key' THEN 1 ELSE 0 END) as keyUnit, SUM(CASE WHEN type = 'nine-small' THEN 1 ELSE 0 END) as nineSmall FROM units WHERE status = 1");
    console.log('unitStats:', JSON.stringify(unitStats));
    const [[deviceStats]] = await pool.query("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal, SUM(CASE WHEN status = 'fault' THEN 1 ELSE 0 END) as fault, SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) as offline FROM device_archive");
    console.log('deviceStats:', JSON.stringify(deviceStats));
    const [[alarmStats]] = await pool.query("SELECT COUNT(*) as total30d, SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as unresolved FROM fire_alarm WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    console.log('alarmStats:', JSON.stringify(alarmStats));
  } catch(e) { console.error('ERR:', e.message); }
  process.exit(0);
})();
"""
    stdin, stdout, stderr = client.exec_command(f'cd /opt/my-fire-api && node -e "{test_code.replace(chr(10), " ").replace(chr(34), chr(92)+chr(34))}"')
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    print("Direct test:")
    print(out)
    if err: print("ERR:", err)
finally:
    client.close()
