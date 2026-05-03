#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

time.sleep(4)

print('=== Health Check ===')
cmd = "curl -s -o /dev/null -w '%{http_code}' http://localhost:5003/api/health ; echo"
stdin, stdout, stderr = ssh.exec_command(cmd)
print('HTTP', stdout.read().decode('utf-8', errors='replace').strip())

print('\n=== DB Columns Check ===')
for t, c in [('device_archive', 'gateway_id'), ('alarms', 'loop_no'), ('alarms', 'point_no'), ('alarms', 'raw_frame_hex')]:
    cmd = f"mysql -uroot -pZhangcong2255 -e \"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='fire_platform' AND TABLE_NAME='{t}' AND COLUMN_NAME='{c}'\""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    if c in out:
        print(f'  [OK] {t}.{c} exists')
    else:
        print(f'  [WARN] {t}.{c} NOT FOUND')

print('\n=== Recent PM2 Logs (last 15 lines) ===')
stdin, stdout, stderr = ssh.exec_command('pm2 logs fire-api --lines 15 --nostream')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
