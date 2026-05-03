#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

stdin, stdout, stderr = ssh.exec_command(
    "curl -s -X POST http://localhost:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
)
login_res = stdout.read().decode('utf-8', errors='replace')
token = json.loads(login_res)['data']['accessToken']
auth = f"Authorization: Bearer {token}"

# More APIs
apis = [
    '/api/dashboard/stats',
    '/api/control-rooms/list',
    '/api/floor-plans/list',
    '/api/personnel/list',
    '/api/work-orders/list',
    '/api/patrol-plans/list',
    '/api/hazards/list',
    '/api/maintenance-contracts/list',
    '/api/devices/status/realtime',
]

for path in apis:
    cmd = f"curl -s -w '\\nHTTP_CODE:%{{http_code}}' -H '{auth}' 'http://localhost:5003{path}'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    lines = out.split('\n')
    http_code = lines[-1].replace('HTTP_CODE:', '')
    body = '\n'.join(lines[:-1])
    print(f'\n=== {path} === HTTP {http_code}')
    if http_code != '200':
        print(body[:500])
    else:
        try:
            d = json.loads(body)
            if d.get('code') != 200:
                print(f'Business code: {d.get("code")}, msg: {d.get("msg")}')
            else:
                print(f'OK: data keys = {list(d.get("data", {}).keys()) if isinstance(d.get("data"), dict) else type(d.get("data"))}')
        except Exception as e:
            print(f'Parse error: {e}')
            print(body[:200])

ssh.close()
