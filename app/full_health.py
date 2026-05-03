import paramiko
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=10)

# Get token
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
token = json.loads(stdout.read().decode('utf-8', errors='replace'))['data']['accessToken']

endpoints = [
    ('GET', '/api/dashboard/stats'),
    ('GET', '/api/dashboard/subsystems'),
    ('GET', '/api/units/list'),
    ('GET', '/api/units/stats/overview'),
    ('GET', '/api/devices/list'),
    ('GET', '/api/devices/status/realtime'),
    ('GET', '/api/alarms/list'),
    ('GET', '/api/alarms/stats'),
    ('GET', '/api/fire-hosts'),
    ('GET', '/api/fscn8001/devices'),
    ('GET', '/api/control-rooms'),
    ('GET', '/api/users'),
    ('GET', '/api/video/devices'),
    ('GET', '/api/workbench'),
    ('GET', '/api/iot-devices'),
    ('GET', '/api/cameras'),
    ('GET', '/api/gb28181-devices'),
    ('GET', '/api/buildings'),
    ('GET', '/api/floors'),
]

print('=== Full API Health Check ===')
failures = []
for method, path in endpoints:
    cmd = f"curl -s -w '%{{http_code}}' -o /tmp/resp.json http://127.0.0.1:5003{path} -H 'Authorization: Bearer {token}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    code = stdout.read().decode('utf-8', errors='replace').strip()
    
    stdin, stdout, stderr = client.exec_command('cat /tmp/resp.json')
    resp = stdout.read().decode('utf-8', errors='replace')
    
    try:
        data = json.loads(resp)
        biz_code = data.get('code', '?')
        msg = data.get('msg', '?')[:40]
    except:
        biz_code = '?'
        msg = resp[:60]
    
    ok = http_ok = code == '200' and biz_code == 200
    status = 'OK' if ok else f'FAIL(http={code},biz={biz_code})'
    if not ok:
        failures.append((path, code, biz_code, msg))
    print(f'{status} {method} {path}')

print('\n=== Failures ===')
for path, code, biz, msg in failures:
    print(f'{path}: HTTP={code}, biz={biz}, msg={msg}')

client.close()
