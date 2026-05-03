#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import paramiko

# Fix Windows console encoding
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

print('[1/3] Restarting PM2 fire-api...')
stdin, stdout, stderr = ssh.exec_command('cd /opt/my-fire-api && pm2 restart fire-api --time')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print(out)
if err.strip():
    print('STDERR:', err.strip())

print('[2/3] Checking PM2 status...')
stdin, stdout, stderr = ssh.exec_command("pm2 describe fire-api | grep -E 'status|pid|uptime'")
print(stdout.read().decode('utf-8', errors='replace'))

print('[3/3] Health check...')
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:5003/api/health ; echo")
print('HTTP', stdout.read().decode('utf-8', errors='replace').strip())

ssh.close()
print('[Done]')
