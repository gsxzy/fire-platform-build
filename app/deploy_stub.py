#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys, paramiko
from scp import SCPClient

sys.stdout = __import__('io').TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST, USER, PASS = "124.223.35.58", "root", "Zhangcong2255"
root = os.path.dirname(os.path.abspath(__file__))

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
scp = SCPClient(ssh.get_transport())

print('Uploading stub.js...')
scp.put(os.path.join(root, "backend/routes/stub.js"), remote_path="/opt/my-fire-api/routes/stub.js")

print('Restarting PM2...')
stdin, stdout, stderr = ssh.exec_command("cd /opt/my-fire-api && pm2 restart fire-api --time")
print(stdout.read().decode('utf-8', errors='replace').strip())

import time
time.sleep(3)

print('Testing POST /gb28181-devices...')
stdin, stdout, stderr = ssh.exec_command(
    "curl -s -X POST http://localhost:5003/api/gb28181-devices -H 'Content-Type: application/json' -H 'Authorization: Bearer test' -d '{\"deviceId\":\"test\",\"name\":\"test\"}'"
)
print(stdout.read().decode('utf-8', errors='replace'))

print('Health check...')
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:5003/api/health ; echo")
print('HTTP', stdout.read().decode('utf-8', errors='replace').strip())

scp.close()
ssh.close()
print('[Done]')
