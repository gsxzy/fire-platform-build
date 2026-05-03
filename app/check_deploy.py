#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# Check if the SIP check exists in deployed JS
print('=== Checking deployed JS for SIP check ===')
stdin, stdout, stderr = ssh.exec_command("grep -n 'SIP服务已停止' /www/wwwroot/fire-platform/assets/GB28181Page-*.js")
out = stdout.read().decode('utf-8', errors='replace').strip()
if out:
    print('Found SIP check in deployed JS:', out)
else:
    print('SIP check NOT found in deployed JS!')

# Check if the old error message still exists
print('\n=== Checking for old error message ===')
stdin, stdout, stderr = ssh.exec_command("grep -n '请检查设备编码是否重复' /www/wwwroot/fire-platform/assets/GB28181Page-*.js")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Old error messages:', out)

# Also check the GB28181Page source in dist
print('\n=== Checking dist/GB28181Page chunk hash ===')
stdin, stdout, stderr = ssh.exec_command("ls -la /www/wwwroot/fire-platform/assets/GB28181Page*.js")
print(stdout.read().decode('utf-8', errors='replace'))

# Test the actual API behavior when SIP is stopped
print('\n=== Testing GB28181 create API ===')
stdin, stdout, stderr = ssh.exec_command(
    "curl -s -X POST http://localhost:5003/api/gb28181-devices -H 'Content-Type: application/json' -H 'Authorization: Bearer test' -d '{\"deviceId\":\"test\",\"name\":\"test\"}'"
)
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
