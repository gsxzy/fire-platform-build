import paramiko, time, urllib.request, json

key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 语法检查
stdin, stdout, stderr = ssh.exec_command('node --check /opt/my-fire-api/fireHostApi.js 2>&1')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('=== SYNTAX ===')
print(out or 'OK')
if err:
    print('ERR:', err)

# 上传
sftp = ssh.open_sftp()
sftp.put(r'D:\新致远智慧消防平台\fire-platform-build\app\backend\fireHostApi.js', '/opt/my-fire-api/fireHostApi.js')
sftp.close()

# 重启
ssh.exec_command('pm2 restart fire-api')
time.sleep(2)

# 测试
req = urllib.request.Request('http://124.223.35.58/api/auth/login', method='POST', headers={'Content-Type': 'application/json'}, data=json.dumps({'username':'admin','password':'admin123'}).encode('utf-8'))
resp = urllib.request.urlopen(req, timeout=10)
data = json.loads(resp.read())
token = data['data']['token']

req = urllib.request.Request('http://124.223.35.58/api/workbench', headers={'Authorization': 'Bearer ' + token})
resp = urllib.request.urlopen(req, timeout=10)
body = json.loads(resp.read())
print('Workbench: HTTP', resp.status, 'code=', body['code'])
print('Keys:', list(body.get('data', {}).keys()))

ssh.close()
