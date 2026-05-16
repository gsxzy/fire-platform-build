import paramiko

host = '124.223.35.58'
user = 'root'
password = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=15)
print('SSH connected')

sftp = client.open_sftp()
sftp.put('frontend-deploy.zip', '/tmp/frontend-deploy.zip')
print('Frontend uploaded')
sftp.put('backend-deploy.zip', '/tmp/backend-deploy.zip')
print('Backend uploaded')
sftp.close()

cmds = [
    'cd /www/wwwroot/fire-platform',
    'cp -r . /www/wwwroot/fire-platform.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true',
    'unzip -o /tmp/frontend-deploy.zip -d /www/wwwroot/fire-platform/',
    'cd /opt/my-fire-api-new',
    'cp -r dist /opt/my-fire-api-new/dist.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true',
    'unzip -o /tmp/backend-deploy.zip -d /opt/my-fire-api-new/dist/',
    'pm2 restart fire-platform',
    'sleep 2',
    'pm2 status fire-platform',
    'curl -s http://127.0.0.1:5003/health',
]
stdin, stdout, stderr = client.exec_command(' && '.join(cmds))
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('=== DEPLOY OUTPUT ===')
print(out[-3000:] if len(out) > 3000 else out)
if err.strip():
    print('=== STDERR ===')
    print(err)
client.close()
print('Done')
