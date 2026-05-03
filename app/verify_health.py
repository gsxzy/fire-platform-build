#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

time.sleep(3)

print('Health check...')
cmd = "curl -s -o /dev/null -w '%{http_code}' http://localhost:5003/api/health ; echo"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('HTTP', stdout.read().decode('utf-8', errors='replace').strip())

print('Recent logs (last 20 lines)...')
stdin, stdout, stderr = ssh.exec_command('pm2 logs fire-api --lines 20 --nostream')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
