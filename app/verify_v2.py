#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Check if both SIP checks exist
print('=== Checking deployed JS ===')
stdin, stdout, stderr = ssh.exec_command("grep -c 'SIP服务已停止' /www/wwwroot/fire-platform/assets/GB28181Page-*.js")
count = stdout.read().decode('utf-8', errors='replace').strip()
print(f'SIP stopped messages found: {count}')

stdin, stdout, stderr = ssh.exec_command("grep -c 'SIP服务异常' /www/wwwroot/fire-platform/assets/GB28181Page-*.js")
count = stdout.read().decode('utf-8', errors='replace').strip()
print(f'SIP exception messages found: {count}')

stdin, stdout, stderr = ssh.exec_command("grep -c '请检查设备编码是否重复' /www/wwwroot/fire-platform/assets/GB28181Page-*.js")
count = stdout.read().decode('utf-8', errors='replace').strip()
print(f'Old duplicate messages found: {count}')

ssh.close()
