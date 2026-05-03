#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Check WVP-PRO config for password
print('=== WVP-PRO config ===')
stdin, stdout, stderr = ssh.exec_command("grep -i 'password\|secret\|admin' /opt/wvp-pro/application.yml 2>/dev/null | head -10")
print(stdout.read().decode('utf-8', errors='replace'))

# Try default WVP login
print('\n=== Testing WVP login ===')
for pwd in ['admin', 'wvp2024', 'Wvp@2024', '123456']:
    cmd = f"curl -s 'http://localhost:18080/api/user/login?username=admin&password={pwd}'"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    try:
        import json
        d = json.loads(out)
        print(f'Password [{pwd}]: code={d.get("code")} msg={d.get("msg", "")[:30]}')
    except:
        print(f'Password [{pwd}]: {out[:100]}')

# Check if there's a .env file with WVP secret
print('\n=== Checking .env ===')
stdin, stdout, stderr = ssh.exec_command("grep -i 'wvp' /opt/my-fire-api/.env 2>/dev/null")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
