#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Check recent error logs
print('=== Recent error log (last 30 lines) ===')
stdin, stdout, stderr = ssh.exec_command('tail -30 /opt/my-fire-api/logs/err.log')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Recent access log (last 20 lines) ===')
stdin, stdout, stderr = ssh.exec_command('tail -20 /opt/my-fire-api/logs/out.log')
print(stdout.read().decode('utf-8', errors='replace'))

# Test key APIs
print('\n=== Testing key APIs ===')
for path in ['/api/health', '/api/units/list', '/api/devices/list', '/api/alarms/list', '/api/alarms/stats', '/api/dashboard/stats']:
    cmd = f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:5003{path} ; echo {path}"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8', errors='replace').strip())

ssh.close()
