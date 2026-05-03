import paramiko

key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 上传修改后的 fireHostApi.js
sftp = ssh.open_sftp()
local_path = r'D:\新致远智慧消防平台\fire-platform-build\app\backend\fireHostApi.js'
remote_path = '/opt/my-fire-api/fireHostApi.js'
sftp.put(local_path, remote_path)
sftp.close()
print(f'Uploaded fireHostApi.js')

# 重启 PM2
stdin, stdout, stderr = ssh.exec_command('pm2 restart fire-api')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('=== PM2 RESTART ===')
print(out)
if err:
    print('ERR:', err)

# 等待服务启动
import time
time.sleep(2)

# 验证路由
import urllib.request, json
for path, name in [
    ('/api/health', 'Health'),
    ('/api/alarms', 'Alarms'),
    ('/api/alarms/list?pageSize=10', 'Alarms List'),
    ('/api/control-rooms', 'Control Rooms'),
    ('/api/control-rooms/hosts', 'Control Room Hosts'),
]:
    try:
        req = urllib.request.Request(f'http://124.223.35.58{path}', headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=10)
        body = resp.read().decode('utf-8', errors='replace')[:100]
        print(f'[OK] {name}: HTTP {resp.status}')
    except urllib.error.HTTPError as e:
        print(f'[AUTH] {name}: HTTP {e.code}')
    except Exception as e:
        print(f'[ERR] {name}: {e}')

ssh.close()
