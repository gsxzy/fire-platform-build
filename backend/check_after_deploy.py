import paramiko
import time

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

time.sleep(3)

stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5003/health')
print('Health check:', stdout.read().decode('utf-8', errors='replace').strip())

stdin, stdout, stderr = ssh.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 show fire-api 2>&1')
out = stdout.read().decode('utf-8', errors='replace')
for line in out.split('\n'):
    if 'status' in line.lower() or 'uptime' in line.lower() or 'script path' in line.lower():
        print(line.strip())

ssh.close()
