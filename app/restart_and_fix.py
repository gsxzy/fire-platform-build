import paramiko, re
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', pkey=key)

# 1. Find and kill old process
stdin, stdout, stderr = client.exec_command("ps aux | grep 'fscn8001Server.js' | grep -v grep")
lines = stdout.read().decode().strip().split('\n')
for line in lines:
    parts = line.split()
    if len(parts) >= 2 and parts[1].isdigit():
        pid = parts[1]
        print(f'Killing PID {pid}')
        client.exec_command(f'kill {pid}')

# 2. Wait and restart
import time
time.sleep(2)
client.exec_command('cd /opt/fscn8001 && nohup node fscn8001Server.js >> fscn8001.log 2>&1 &')
print('Restarted fscn8001Server.js')

# 3. Fix historical data: update start_time from description eventTime
# Extract event time from description like "事件时间:2026-04-28 18:47:27 前置数据:..."
fix_sql = """
UPDATE alarms 
SET start_time = STR_TO_DATE(
    SUBSTRING_INDEX(SUBSTRING_INDEX(description, '事件时间:', -1), ' 前置数据:', 1),
    '%Y-%m-%d %H:%i:%s'
)
WHERE description LIKE '%事件时间:%' 
  AND start_time != STR_TO_DATE(
    SUBSTRING_INDEX(SUBSTRING_INDEX(description, '事件时间:', -1), ' 前置数据:', 1),
    '%Y-%m-%d %H:%i:%s'
);
"""
stdin, stdout, stderr = client.exec_command(f'mysql -u root -S /tmp/mysql.sock smart_fire -e "{fix_sql.replace(chr(10), " ")}"')
out = stdout.read().decode()
err = stderr.read().decode()
print(f'SQL out: {out}')
print(f'SQL err: {err}')

# 4. Verify
stdin, stdout, stderr = client.exec_command("mysql -u root -S /tmp/mysql.sock smart_fire -e 'SELECT id, alarm_type, start_time FROM alarms ORDER BY id DESC LIMIT 5;'")
print('Latest alarms:')
print(stdout.read().decode())

client.close()
print('Done')
