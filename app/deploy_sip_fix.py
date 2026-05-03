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

print('Uploading frontend dist/...')
ssh.exec_command("rm -rf /www/wwwroot/fire-platform/assets /www/wwwroot/fire-platform/*.html /www/wwwroot/fire-platform/*.png 2>/dev/null")
scp.put(os.path.join(root, "dist"), recursive=True, remote_path="/www/wwwroot/fire-platform/")

# Fix: move dist contents to root
ssh.exec_command('cd /www/wwwroot/fire-platform && mv dist/* . 2>/dev/null; rm -rf dist')

print('Reloading nginx...')
ssh.exec_command('nginx -s reload')

print('Verifying...')
stdin, stdout, stderr = ssh.exec_command("ls /www/wwwroot/fire-platform/index.html && curl -s -o /dev/null -w '%{http_code}' http://localhost/ ; echo")
print(stdout.read().decode('utf-8', errors='replace').strip())

scp.close()
ssh.close()
print('[Done]')
