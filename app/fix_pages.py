#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# 1. Check WVP-PRO status
print('=== WVP-PRO Status ===')
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:18080/ ; echo")
print('WVP HTTP', stdout.read().decode('utf-8', errors='replace').strip())

# Check if WVP is running
stdin, stdout, stderr = ssh.exec_command("ps aux | grep -i wvp | grep -v grep")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('WVP process:', out[:200] if out else 'NOT RUNNING')

# 2. Check control-rooms route
print('\n=== Checking control-rooms route ===')
stdin, stdout, stderr = ssh.exec_command("grep -r 'control-rooms' /opt/my-fire-api/routes/ /opt/my-fire-api/routes/index.js")
print(stdout.read().decode('utf-8', errors='replace'))

# 3. Check maintenance-contracts route
print('\n=== Checking maintenance-contracts route ===')
stdin, stdout, stderr = ssh.exec_command("grep -r 'maintenance-contracts\|maint-contracts' /opt/my-fire-api/routes/ /opt/my-fire-api/routes/index.js")
print(stdout.read().decode('utf-8', errors='replace'))

# 4. Check stub router
print('\n=== Checking stub.js ===')
stdin, stdout, stderr = ssh.exec_command("grep -n 'control_rooms\|maintenance_contracts' /opt/my-fire-api/routes/stub.js | head -20")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
