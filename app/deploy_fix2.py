import paramiko
import os
import sys

LOCAL_FILE = r'D:\新致远智慧消防平台\fire-platform-build\app\backend\gb26875Server.js'
REMOTE_PATH = '/opt/my-fire-api/gb26875Server.js'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)
    sftp = client.open_sftp()
    
    print('Uploading gb26875Server.js...')
    sftp.put(LOCAL_FILE, REMOTE_PATH)
    sftp.close()
    print('Upload done.')
    
    print('Restarting PM2 fire-api...')
    stdin, stdout, stderr = client.exec_command('cd /opt/my-fire-api && pm2 restart fire-api')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out.encode('utf-8', errors='replace').decode('utf-8'))
    if err:
        print('ERR:', err.encode('utf-8', errors='replace').decode('utf-8'))
    
    print('Verifying fix...')
    stdin, stdout, stderr = client.exec_command("grep -n 'allocUnsafe' /opt/my-fire-api/gb26875Server.js")
    out = stdout.read().decode('utf-8', errors='replace')
    print(out)
    
    client.close()
    print('Done.')

if __name__ == '__main__':
    main()
