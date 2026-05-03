import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

commands = [
    ("mysql -u root -D fire_platform -e 'SELECT COUNT(*) as total FROM fscn8001_device;'", "设备数量"),
    ("mysql -u root -D fire_platform -e 'SELECT COUNT(*) as total FROM fscn8001_alarm;'", "报警数量"),
    ("mysql -u root -D fire_platform -e 'SELECT COUNT(*) as total FROM fscn8001_raw_log;'", "原始报文数量"),
    ("mysql -u root -D fire_platform -e 'SELECT device_sn, device_name, status, last_heartbeat FROM fscn8001_device LIMIT 3;'", "设备列表"),
    ("mysql -u root -D fire_platform -e 'SELECT device_sn, alarm_type, alarm_level, location, alarm_time FROM fscn8001_alarm ORDER BY id DESC LIMIT 3;'", "最新报警"),
    ("tail -n 20 /opt/my-fire-api/logs/out.log", "后端日志"),
]

results = []
for cmd, desc in commands:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    results.append(f"=== {desc} ===\n{out}\n{err}\n")

client.close()

with open('push_result.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print('Push result written to push_result.txt')
