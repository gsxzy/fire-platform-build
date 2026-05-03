import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

commands = [
    "mysql -u root -D fire_platform -e \"SHOW TABLES LIKE 'fscn8001%';\"",
    "mysql -u root -D fire_platform -e \"DESCRIBE fscn8001_alarm;\" 2>/dev/null || echo 'TABLE_NOT_FOUND'",
    "mysql -u root -D fire_platform -e \"DESCRIBE fscn8001_device;\" 2>/dev/null || echo 'TABLE_NOT_FOUND'",
    "mysql -u root -D fire_platform -e \"DESCRIBE fscn8001_raw_log;\" 2>/dev/null || echo 'TABLE_NOT_FOUND'",
]

results = []
for cmd in commands:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    results.append(f"CMD: {cmd}\nOUT:\n{out}\nERR:\n{err}\n{'='*50}")

client.close()

with open('db_tables_check.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print('DB tables check written to db_tables_check.txt')
