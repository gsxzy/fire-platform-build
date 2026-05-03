#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io, paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

tables = ['device_archive', 'fire_alarm', 'alarms']
for t in tables:
    print(f'=== {t} columns ===')
    cmd = f'mysql -uroot -pZhangcong2255 -e "DESCRIBE fire_platform.{t}"'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
