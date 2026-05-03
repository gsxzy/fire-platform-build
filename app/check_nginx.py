#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

print('=== Nginx config test ===')
stdin, stdout, stderr = ssh.exec_command('nginx -t')
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))

print('\n=== Website root directory ===')
stdin, stdout, stderr = ssh.exec_command('ls -la /www/wwwroot/fire-platform/ | head -20')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Check index.html exists ===')
stdin, stdout, stderr = ssh.exec_command('ls -la /www/wwwroot/fire-platform/index.html')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Nginx error log (last 10 lines) ===')
stdin, stdout, stderr = ssh.exec_command('tail -10 /var/log/nginx/error.log')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Nginx config content ===')
stdin, stdout, stderr = ssh.exec_command('cat /www/server/panel/vhost/nginx/fire-platform.conf')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
