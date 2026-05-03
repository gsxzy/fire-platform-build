#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Login
stdin, stdout, stderr = ssh.exec_command(
    "curl -s -X POST http://localhost:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
)
login_res = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = login_res['data']['accessToken']
auth = f"Authorization: Bearer {token}"

# Test POST with actual device data
print('=== POST /api/gb28181-devices (actual data) ===')
test_data = json.dumps({
    "deviceId": "34020000001320000003",
    "name": "摄像头1",
    "ip": "192.168.1.100",
    "port": 5060,
    "manufacturer": "海康威视",
    "model": "DS-2CD3T25",
    "transport": "UDP",
    "unitId": "",
    "location": "新致远大厅"
}, ensure_ascii=False)
cmd = f"curl -s -w '\\nHTTP_CODE:%{{http_code}}' -H '{auth}' -H 'Content-Type: application/json' -X POST -d '{test_data}' http://localhost:5003/api/gb28181-devices"
stdin, stdout, stderr = ssh.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace').strip()
lines = out.split('\n')
http_code = lines[-1].replace('HTTP_CODE:', '')
body = '\n'.join(lines[:-1])
print(f'HTTP {http_code}')
print(body[:500])

# Check PM2 logs for stub errors
print('\n=== PM2 logs (last 10 lines with "Stub" or "gb28181") ===')
stdin, stdout, stderr = ssh.exec_command("pm2 logs fire-api --lines 20 --nostream | grep -iE 'stub|gb28181|create error' | tail -10")
print(stdout.read().decode('utf-8', errors='replace'))

# Check what columns gb28181_devices has
print('\n=== gb28181_devices columns ===')
stdin, stdout, stderr = ssh.exec_command("mysql -uroot -pZhangcong2255 -e \"DESCRIBE fire_platform.gb28181_devices\" 2>/dev/null")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
