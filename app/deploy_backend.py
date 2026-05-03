#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import paramiko, os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
REMOTE_DIR = '/opt/my-fire-api'

local_files = [
    ('backend/routes/stub.js', f'{REMOTE_DIR}/routes/stub.js'),
    ('backend/fireHostApi.js', f'{REMOTE_DIR}/fireHostApi.js'),
]

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = ssh.open_sftp()

for local, remote in local_files:
    abs_local = os.path.join(os.getcwd(), local)
    print(f'Uploading {local} -> {remote}')
    sftp.put(abs_local, remote)
    # 设置权限
    ssh.exec_command(f'chmod 644 {remote}')
    print(f'  Done')

sftp.close()

# Restart PM2
print('Restarting fire-api...')
stdin, stdout, stderr = ssh.exec_command('pm2 restart fire-api')
print(stdout.read().decode('utf-8', errors='replace'))
err = stderr.read().decode('utf-8', errors='replace')
if err:
    print('ERR:', err)

# Check status
stdin, stdout, stderr = ssh.exec_command('pm2 status fire-api')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('Backend deployment complete.')
