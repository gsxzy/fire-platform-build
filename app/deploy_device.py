import paramiko
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=10)

with open(r'D:\新致远智慧消防平台\fire-platform-build\app\backend\routes\device.js', 'r', encoding='utf-8') as f:
    content = f.read()
sftp = client.open_sftp()
with sftp.file('/opt/my-fire-api/routes/device.js', 'w') as remote_file:
    remote_file.write(content)
sftp.close()

stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api --update-env')
print(stdout.read().decode('utf-8', errors='replace'))

# Get token
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
token = json.loads(stdout.read().decode('utf-8', errors='replace'))['data']['accessToken']

# Test realtime
stdin, stdout, stderr = client.exec_command(f"curl -s http://127.0.0.1:5003/api/devices/status/realtime -H 'Authorization: Bearer {token}'")
print('Realtime:', stdout.read().decode('utf-8', errors='replace')[:200])

client.close()
