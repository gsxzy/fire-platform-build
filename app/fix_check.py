import paramiko
import time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

print('Waiting 5s for new connections...')
time.sleep(5)

stdin, stdout, stderr = client.exec_command('tail -n 30 /opt/my-fire-api/logs/out.log')
out = stdout.read().decode('utf-8', errors='replace')
with open('fix_check.txt', 'w', encoding='utf-8') as f:
    f.write('=== Latest logs after fix ===\n')
    f.write(out)

stdin, stdout, stderr = client.exec_command("mysql -e 'SELECT device_id, status, last_heartbeat FROM fire_platform.gb26875_device;' 2>/dev/null || echo mysql_failed")
out = stdout.read().decode('utf-8', errors='replace')
with open('fix_check.txt', 'a', encoding='utf-8') as f:
    f.write('\n=== Devices ===\n')
    f.write(out)

client.close()
print('done')
