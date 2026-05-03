#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Get a token first for authenticated requests
print('=== Getting token ===')
stdin, stdout, stderr = ssh.exec_command(
    "curl -s -X POST http://localhost:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
)
login_res = stdout.read().decode('utf-8', errors='replace')
print(login_res[:500])

import json
try:
    token_data = json.loads(login_res)
    token = token_data.get('data', {}).get('token', '')
except:
    token = ''

if token:
    print(f'\nToken: {token[:30]}...')
    auth_header = f"Authorization: Bearer {token}"
    
    print('\n=== Testing authenticated APIs ===')
    for path in ['/api/units/list', '/api/devices/list', '/api/alarms/list', '/api/dashboard/stats', '/api/video/devices']:
        cmd = f"curl -s -o /dev/null -w '%{{http_code}}' -H '{auth_header}' http://localhost:5003{path} ; echo {path}"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode('utf-8', errors='replace').strip())
    
    # Also test with verbose output for failing ones
    print('\n=== Detailed check for video API ===')
    cmd = f"curl -s -H '{auth_header}' http://localhost:5003/api/video/devices | head -c 500"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print('\n=== Detailed check for dashboard stats ===')
    cmd = f"curl -s -H '{auth_header}' http://localhost:5003/api/dashboard/stats | head -c 500"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8', errors='replace'))
else:
    print('Failed to get token')

# Check for any 500 errors in PM2 logs
print('\n=== Searching for 500 errors in logs ===')
stdin, stdout, stderr = ssh.exec_command("grep -i '500\\|error\\|fail' /opt/my-fire-api/logs/out.log | tail -20")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
