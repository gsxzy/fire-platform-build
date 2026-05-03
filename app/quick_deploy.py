import paramiko, time

key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

sftp = ssh.open_sftp()
sftp.put(r'D:\新致远智慧消防平台\fire-platform-build\app\backend\fireHostApi.js', '/opt/my-fire-api/fireHostApi.js')
sftp.close()

ssh.exec_command('pm2 restart fire-api')
time.sleep(2)

# 验证
import urllib.request, json
req = urllib.request.Request('http://124.223.35.58/api/auth/login', method='POST')
req.add_header('Content-Type', 'application/json')
req.data = json.dumps({'username':'admin','password':'admin123'}).encode('utf-8')
resp = urllib.request.urlopen(req, timeout=10)
data = json.loads(resp.read())
token = data['data'].get('token')

for path, name in [
    ('/api/alarms/list?pageSize=1', 'Alarms List'),
    ('/api/control-rooms/hosts?roomId=CR-001', 'CR Hosts CR-001'),
    ('/api/control-rooms/hosts', 'CR Hosts All'),
]:
    req = urllib.request.Request(f'http://124.223.35.58{path}')
    req.add_header('Authorization', f'Bearer {token}')
    resp = urllib.request.urlopen(req, timeout=10)
    body = json.loads(resp.read())
    list_len = len(body.get('data', []) if isinstance(body.get('data'), list) else body.get('data', {}).get('list', []))
    print(f'[OK] {name}: {list_len} items')

ssh.close()
