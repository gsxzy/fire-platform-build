import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

files = [
    ('/opt/my-fire-api/fireHostApi.js', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\fireHostApi.js'),
    ('/opt/my-fire-api/routes/video.js', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\routes\video.js'),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)

sftp = client.open_sftp()
for remote, local in files:
    with open(local, 'r', encoding='utf-8') as f:
        content = f.read()
    with sftp.file(remote, 'w') as remote_file:
        remote_file.write(content)
    print('Uploaded', remote)
sftp.close()

stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api --update-env')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('PM2 stdout:', out)
if err:
    print('PM2 stderr:', err)

client.close()
print('Deploy done')
