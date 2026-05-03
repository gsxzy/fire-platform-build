import paramiko
import sys

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
REMOTE_API = '/opt/my-fire-api'
LOCAL_APP_JS = r'D:\新致远智慧消防平台\fire-platform-build\backend\dist\app.js'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

try:
    sys.stdout.write('[1/2] Uploading dist/app.js...\n')
    sftp.put(LOCAL_APP_JS, REMOTE_API + '/dist/app.js')
    sys.stdout.write('  OK: dist/app.js uploaded\n')

    sys.stdout.write('[2/2] Restarting PM2 fire-api...\n')
    stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api 2>&1')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    sys.stdout.write(out.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) if out else '(no output)\n')
    if err.strip():
        sys.stdout.write('ERR: ' + err.encode(sys.stdout.encoding, errors='replace').decode(sys.stdout.encoding) + '\n')

    sys.stdout.write('\nDeployment completed!\n')
finally:
    sftp.close()
    client.close()
