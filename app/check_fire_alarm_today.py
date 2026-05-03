import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 fire_platform -e \"SELECT created_at, device_id, protocol, alarm_type, description FROM fire_alarm WHERE DATE(created_at) = CURDATE() ORDER BY created_at DESC;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Today fire_alarm records:')
print(out)

client.close()
