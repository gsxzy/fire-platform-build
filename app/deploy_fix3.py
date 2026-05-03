import paramiko
import os

LOCAL_FILE = r'D:\新致远智慧消防平台\fire-platform-build\app\backend\gb26875Server.js'
REMOTE_PATH = '/opt/my-fire-api/gb26875Server.js'
RESULT_FILE = r'D:\新致远智慧消防平台\fire-platform-build\app\deploy_result.txt'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)
    sftp = client.open_sftp()
    
    results = []
    results.append('Uploading gb26875Server.js...')
    sftp.put(LOCAL_FILE, REMOTE_PATH)
    sftp.close()
    results.append('Upload done.')
    
    results.append('Restarting PM2 fire-api...')
    stdin, stdout, stderr = client.exec_command('cd /opt/my-fire-api && pm2 restart fire-api')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    results.append(out)
    if err.strip():
        results.append('ERR: ' + err)
    
    results.append('Verifying fix...')
    stdin, stdout, stderr = client.exec_command("grep -n 'allocUnsafe' /opt/my-fire-api/gb26875Server.js")
    out = stdout.read().decode('utf-8', errors='replace')
    results.append(out)
    
    client.close()
    results.append('Done.')
    
    with open(RESULT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(results))
    print('Results written to deploy_result.txt')

if __name__ == '__main__':
    main()
