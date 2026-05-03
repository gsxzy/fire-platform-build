import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Read app.js route mounts
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/app.js')
appjs = stdout.read().decode('utf-8', errors='replace')

# Extract app.use lines
import re
for line in appjs.split('\n'):
    if 'app.use' in line or 'router' in line.lower():
        print(line.strip())

print('\n=== Database tables ===')
stdin, stdout, stderr = client.exec_command("mysql -u root -pZhangcong2255 -e 'SHOW TABLES;' fire_platform")
for t in stdout.read().decode('utf-8', errors='replace').strip().split('\n'):
    print(t)

client.close()
