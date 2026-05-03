#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys, paramiko
from scp import SCPClient

sys.stdout = __import__('io').TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST, USER, PASS = "124.223.35.58", "root", "Zhangcong2255"
root = os.path.dirname(os.path.abspath(__file__))

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print('[1/4] Connecting...')
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
scp = SCPClient(ssh.get_transport())

print('[2/4] Uploading frontend dist/...')
ssh.exec_command("rm -rf /www/wwwroot/fire-platform/assets /www/wwwroot/fire-platform/*.html /www/wwwroot/fire-platform/*.png 2>/dev/null")
scp.put(os.path.join(root, "dist"), recursive=True, remote_path="/www/wwwroot/fire-platform/")
print('  OK')

backend_files = [
    ("backend/utils/initDb.js", "/opt/my-fire-api/utils/initDb.js"),
    ("backend/fscn8001Server.js", "/opt/my-fire-api/fscn8001Server.js"),
    ("backend/routes/device.js", "/opt/my-fire-api/routes/device.js"),
]

print('[3/4] Uploading backend files...')
for local, remote in backend_files:
    local_path = os.path.join(root, local)
    remote_dir = os.path.dirname(remote)
    ssh.exec_command(f"mkdir -p {remote_dir}")
    scp.put(local_path, remote_path=remote)
    print(f'  OK {local}')

print('[4/4] Restarting PM2 fire-api...')
stdin, stdout, stderr = ssh.exec_command("cd /opt/my-fire-api && pm2 restart fire-api --time")
print(stdout.read().decode('utf-8', errors='replace').strip())
err = stderr.read().decode('utf-8', errors='replace').strip()
if err:
    print(f'  WARN: {err}')

print('Checking status...')
stdin, stdout, stderr = ssh.exec_command("pm2 describe fire-api | grep -E 'status|pid|uptime'")
print(stdout.read().decode('utf-8', errors='replace').strip())

print('Health check...')
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:5003/api/health ; echo")
print('HTTP', stdout.read().decode('utf-8', errors='replace').strip())

scp.close()
ssh.close()
print('[Done]')
