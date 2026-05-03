#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import paramiko, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

# 1. Login
stdin, stdout, stderr = ssh.exec_command(
    "curl -s -X POST http://localhost:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
)
login_res = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = login_res['data']['accessToken']
auth = f"Authorization: Bearer {token}"
print(f'Login OK, token={token[:20]}...')

# 2. Verify stub.js has NO gb28181 routes
print('\n=== 1. Verify stub.js has NO gb28181 routes ===')
stdin, stdout, stderr = ssh.exec_command("grep -n 'gb28181' /opt/my-fire-api/routes/stub.js")
out = stdout.read().decode('utf-8', errors='replace').strip()
if out:
    print('WARNING: stub.js still has gb28181 routes!')
    print(out)
else:
    print('OK: stub.js has no gb28181 routes')

# 3. Verify fireHostApi.js HAS gb28181 POST route
print('\n=== 2. Verify fireHostApi.js has POST /gb28181-devices ===')
stdin, stdout, stderr = ssh.exec_command("grep -n \"router.post('/gb28181-devices'\" /opt/my-fire-api/fireHostApi.js")
out = stdout.read().decode('utf-8', errors='replace').strip()
if out:
    print('OK:', out)
else:
    print('ERROR: fireHostApi.js missing POST /gb28181-devices!')

# 4. Test POST /api/gb28181-devices with proper data
print('\n=== 3. Test POST /api/gb28181-devices ===')
test_data = json.dumps({
    "deviceId": "34020000001320000099",
    "name": "验证测试摄像头",
    "ip": "192.168.1.200",
    "port": 5060,
    "manufacturer": "海康威视",
    "model": "DS-2CD3T25",
    "transport": "UDP",
    "unitId": "",
    "location": "测试位置"
}, ensure_ascii=False)
cmd = f"curl -s -w '\\nHTTP_CODE:%{{http_code}}' -H '{auth}' -H 'Content-Type: application/json' -X POST -d '{test_data}' http://localhost:5003/api/gb28181-devices"
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace').strip()
lines = out.split('\n')
http_code = lines[-1].replace('HTTP_CODE:', '')
body = '\n'.join(lines[:-1])
print(f'HTTP {http_code}')
try:
    body_json = json.loads(body)
    print(f'Response: code={body_json.get("code")}, msg={body_json.get("msg")}')
    if body_json.get('code') == 200:
        print('OK: Create succeeded!')
        created_id = body_json.get('data', {}).get('id')
        if created_id:
            print(f'Created id={created_id}')
            # Cleanup: delete the test device
            print('Cleaning up test device...')
            stdin, stdout, stderr = ssh.exec_command(f"curl -s -H '{auth}' -X DELETE http://localhost:5003/api/gb28181-devices/{created_id}")
            del_res = json.loads(stdout.read().decode('utf-8', errors='replace'))
            print(f'Delete result: code={del_res.get("code")}, msg={del_res.get("msg")}')
    else:
        print(f'ERROR: {body_json.get("msg")}')
except:
    print(f'Raw response: {body[:500]}')

# 5. Check frontend index.html has new hash
print('\n=== 4. Check frontend assets hash (new build) ===')
stdin, stdout, stderr = ssh.exec_command("ls /www/wwwroot/fire-platform/assets/ | grep GB28181")
out = stdout.read().decode('utf-8', errors='replace').strip()
print(out)

ssh.close()
print('\nVerification complete.')
