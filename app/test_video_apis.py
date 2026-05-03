import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Get token
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
if resp.get('code') != 200:
    print('Login failed:', resp)
    client.close()
    exit(1)
token = resp['data']['accessToken']

endpoints = [
    ('GET', '/api/video/devices'),
    ('GET', '/api/video/devices?page=1&count=10'),
    ('GET', '/api/gb28181-devices'),
    ('GET', '/api/gb28181-devices/list'),
    ('GET', '/api/cameras/list'),
    ('GET', '/api/cameras/1'),
]

print('=== Video/GB28181 API Test ===')
for method, path in endpoints:
    cmd = f"curl -s -w '%{{http_code}}' -o /tmp/resp.json http://127.0.0.1:5003{path} -H 'Authorization: Bearer {token}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    code = stdout.read().decode('utf-8', errors='replace').strip()
    stdin, stdout, stderr = client.exec_command('cat /tmp/resp.json')
    body = stdout.read().decode('utf-8', errors='replace')
    try:
        d = json.loads(body)
        biz = d.get('code', '?')
        msg = d.get('msg', d.get('message', '?'))[:60]
    except:
        biz = '?'
        msg = body[:80]
    ok = code == '200' and biz == 200
    print(f"{'OK' if ok else 'FAIL'} {method} {path} (http={code}, biz={biz}) msg={msg}")

# Check WVP status
print('\n=== WVP Service Status ===')
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:18080/api/user/login?username=admin&password=admin 2>&1 | head -c 200")
print('WVP login test:', stdout.read().decode('utf-8', errors='replace').strip()[:100])

stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:18080/api/device/list 2>&1 | head -c 200")
print('WVP device list:', stdout.read().decode('utf-8', errors='replace').strip()[:100])

client.close()
