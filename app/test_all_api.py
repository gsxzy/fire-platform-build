#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

time.sleep(3)

stdin, stdout, stderr = ssh.exec_command(
    "curl -s -X POST http://localhost:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
)
login_res = stdout.read().decode('utf-8', errors='replace')
token = json.loads(login_res)['data']['accessToken']
auth = f"Authorization: Bearer {token}"

apis = [
    '/api/video/devices?page=1&count=10',
    '/api/control-rooms/list?page=1&pageSize=10',
    '/api/control-rooms',
    '/api/maint-contracts/list?page=1&pageSize=10',
    '/api/plans/list?page=1&pageSize=10',
    '/api/drills/list?page=1&pageSize=10',
    '/api/inspections/list?page=1&pageSize=10',
    '/api/notifications/list?page=1&pageSize=10',
    '/api/units/list?page=1&pageSize=10',
    '/api/devices/list?page=1&pageSize=10',
    '/api/alarms/list?page=1&pageSize=10',
    '/api/dashboard/stats',
    '/api/floor-plans/list?page=1&pageSize=10',
    '/api/personnel/list?page=1&pageSize=10',
    '/api/work-orders/list?page=1&pageSize=10',
    '/api/patrol-plans/list?page=1&pageSize=10',
    '/api/hazards/list?page=1&pageSize=10',
]

print('=== API Test Results ===')
for path in apis:
    cmd = f"curl -s -w '\\nHTTP_CODE:%{{http_code}}' -H '{auth}' 'http://localhost:5003{path}'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    lines = out.split('\n')
    http_code = lines[-1].replace('HTTP_CODE:', '')
    body = '\n'.join(lines[:-1])
    status = 'OK' if http_code == '200' else 'FAIL'
    print(f'  [{status}] {http_code} {path}')
    if http_code != '200':
        try:
            d = json.loads(body)
            print(f'       msg: {d.get("msg", body[:100])}')
        except:
            print(f'       body: {body[:100]}')

ssh.close()
