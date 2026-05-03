#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Move dist contents to parent directory
print('Moving dist/* to fire-platform/ ...')
stdin, stdout, stderr = ssh.exec_command(
    'cd /www/wwwroot/fire-platform && mv dist/* . && mv dist/assets . 2>/dev/null; rm -rf dist; ls -la'
)
print(stdout.read().decode('utf-8', errors='replace'))

print('\nVerifying index.html...')
stdin, stdout, stderr = ssh.exec_command('ls -la /www/wwwroot/fire-platform/index.html')
print(stdout.read().decode('utf-8', errors='replace'))

print('\nReloading nginx...')
stdin, stdout, stderr = ssh.exec_command('nginx -s reload')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

print('\nTesting HTTP...')
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost/ ; echo")
print('HTTP', stdout.read().decode('utf-8', errors='replace').strip())

ssh.close()
print('[Done]')
