import paramiko
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
LOCAL_FILE = r'D:\新致远智慧消防平台\fire-platform-build\app\backend\gb26875Server.js'
REMOTE_FILE = '/opt/my-fire-api/gb26875Server.js'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

try:
    sys.stdout.write('[1/3] Uploading gb26875Server.js...\n')
    sftp.put(LOCAL_FILE, REMOTE_FILE)
    sys.stdout.write('  OK\n')
    
    sys.stdout.write('[2/3] Checking PM2 fire-api status...\n')
    stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 show fire-api 2>&1 | grep status')
    out = stdout.read().decode('utf-8', errors='replace')
    sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding))
    
    sys.stdout.write('[3/3] Restarting PM2 fire-api...\n')
    stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api 2>&1')
    out = stdout.read().decode('utf-8', errors='replace')
    sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding)[:500])
    
    sys.stdout.write('\nDeployment complete!\n')
finally:
    sftp.close()
    client.close()
