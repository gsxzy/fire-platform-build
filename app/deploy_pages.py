#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys, paramiko
from scp import SCPClient

sys.stdout = __import__('io').TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST, USER, PASS = "124.223.35.58", "root", "Zhangcong2255"
root = os.path.dirname(os.path.abspath(__file__))

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print('[1/3] Connecting...')
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
scp = SCPClient(ssh.get_transport())

print('[2/3] Uploading backend files...')
files = [
    ("backend/routes/video.js", "/opt/my-fire-api/routes/video.js"),
    ("backend/fireHostApi.js", "/opt/my-fire-api/fireHostApi.js"),
]
for local, remote in files:
    scp.put(os.path.join(root, local), remote_path=remote)
    print(f'  OK {local}')

print('[3/3] Restarting PM2...')
stdin, stdout, stderr = ssh.exec_command("cd /opt/my-fire-api && pm2 restart fire-api --time")
print(stdout.read().decode('utf-8', errors='replace').strip())

print('Health check...')
import time
time.sleep(4)
cmd = "curl -s -o /dev/null -w '%{http_code}' http://localhost:5003/api/health ; echo"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('HTTP', stdout.read().decode('utf-8', errors='replace').strip())

scp.close()
ssh.close()
print('[Done]')
