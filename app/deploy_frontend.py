#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import paramiko, os, sys, io, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
REMOTE_DIR = '/www/wwwroot/fire-platform'
LOCAL_DIST = os.path.join(os.getcwd(), 'dist')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

# Clean old files (keep any non-assets files if needed, but full replace is safer)
print('Cleaning remote dist directory...')
stdin, stdout, stderr = ssh.exec_command(f'rm -rf {REMOTE_DIR}/assets {REMOTE_DIR}/index.html')
stdout.read()

# Upload new files via SFTP
sftp = ssh.open_sftp()

def upload_dir(local_dir, remote_dir):
    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"
        if os.path.isdir(local_path):
            # Create remote dir
            try:
                sftp.mkdir(remote_path)
            except IOError:
                pass  # already exists
            upload_dir(local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            # print(f'  {local_path} -> {remote_path}')

print(f'Uploading {LOCAL_DIST} -> {REMOTE_DIR}')
upload_dir(LOCAL_DIST, REMOTE_DIR)
sftp.close()

# Verify index.html exists at root
stdin, stdout, stderr = ssh.exec_command(f'ls -la {REMOTE_DIR}/index.html')
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Remote index.html:', out)

# Reload nginx
print('Reloading nginx...')
stdin, stdout, stderr = ssh.exec_command('nginx -s reload')
out = stdout.read().decode('utf-8', errors='replace').strip()
err = stderr.read().decode('utf-8', errors='replace').strip()
if out:
    print(out)
if err:
    print('nginx err:', err)

ssh.close()
print('Frontend deployment complete.')
