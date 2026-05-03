import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

endpoints = [
    ('GET', '/api/video/devices'),
    ('GET', '/api/gb28181-devices/list'),
    ('GET', '/api/gb28181-devices'),
    ('GET', '/api/cameras/list'),
]

print('=== Full Video/GB28181 API Test ===')
for method, path in endpoints:
    cmd = f"curl -s -w '%{{http_code}}' -o /tmp/resp.json http://127.0.0.1:5003{path} -H 'Authorization: Bearer {token}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    code = stdout.read().decode('utf-8', errors='replace').strip()
    stdin, stdout, stderr = client.exec_command('cat /tmp/resp.json')
    body = stdout.read().decode('utf-8', errors='replace')
    try:
        d = json.loads(body)
        biz = d.get('code', '?')
        msg = d.get('msg', d.get('message', '?'))[:40]
    except:
        biz = '?'
        msg = body[:50]
    ok = code == '200' and biz == 200
    print(f"{'OK' if ok else 'FAIL'} {method} {path} (http={code}, biz={biz}) msg={msg}")

# Check WVP directly
print('\n=== WVP Direct Test ===')
stdin, stdout, stderr = client.exec_command("curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3' 2>&1 | head -c 100")
print('WVP login:', stdout.read().decode('utf-8', errors='replace').strip())

client.close()
