#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Check WVP-PRO MySQL for admin password
print('=== WVP-PRO DB admin user ===')
stdin, stdout, stderr = ssh.exec_command(
    "mysql -uroot -pZhangcong2255 -e \"SELECT username, password FROM wvp.user WHERE username='admin' LIMIT 1\""
)
print(stdout.read().decode('utf-8', errors='replace'))

# Check WVP-PRO application.yml full content
print('\n=== WVP-PRO application.yml ===')
stdin, stdout, stderr = ssh.exec_command("cat /opt/wvp-pro/application.yml 2>/dev/null | head -50")
print(stdout.read().decode('utf-8', errors='replace'))

# Check WVP-PRO config location
print('\n=== WVP-PRO config files ===')
stdin, stdout, stderr = ssh.exec_command("ls -la /opt/wvp-pro/*.yml /opt/wvp-pro/*.properties 2>/dev/null")
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
