import paramiko
import os

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'
REMOTE_API = '/opt/my-fire-api'
LOCAL_DIST = r'D:\新致远智慧消防平台\fire-platform-build\backend\dist'
LOCAL_PKG = r'D:\新致远智慧消防平台\fire-platform-build\backend\package.json'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

try:
    # 1. Upload dist directory
    print('[1/5] Uploading dist directory...')
    client.exec_command('mkdir -p ' + REMOTE_API + '/dist')
    for root, dirs, files in os.walk(LOCAL_DIST):
        for d in dirs:
            remote_dir = os.path.join(REMOTE_API, 'dist', os.path.relpath(os.path.join(root, d), LOCAL_DIST)).replace('\\', '/')
            client.exec_command('mkdir -p ' + remote_dir)
        for f in files:
            local_path = os.path.join(root, f)
            remote_path = os.path.join(REMOTE_API, 'dist', os.path.relpath(local_path, LOCAL_DIST)).replace('\\', '/')
            sftp.put(local_path, remote_path)
    print('  OK: dist uploaded')

    # 2. Upload package.json
    print('[2/5] Uploading package.json...')
    sftp.put(LOCAL_PKG, REMOTE_API + '/package.json')
    print('  OK: package.json uploaded')

    # 3. Backup and update ecosystem.config.js
    print('[3/5] Updating ecosystem.config.js...')
    client.exec_command('cp ' + REMOTE_API + '/ecosystem.config.js ' + REMOTE_API + '/ecosystem.config.js.bak')
    with sftp.file(REMOTE_API + '/ecosystem.config.js', 'r') as f:
        content = f.read().decode('utf-8')
    content = content.replace("script: './server.js'", "script: './dist/app.js'")
    with sftp.file(REMOTE_API + '/ecosystem.config.js', 'w') as f:
        f.write(content.encode('utf-8'))
    print('  OK: ecosystem.config.js updated')

    # 4. Install dependencies
    print('[4/5] Installing dependencies...')
    stdin, stdout, stderr = client.exec_command('cd ' + REMOTE_API + ' && npm install 2>&1')
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out[-500:] if len(out) > 500 else out)
    if err.strip(): print('ERR:', err[-500:])

    # 5. Restart PM2
    print('[5/5] Restarting PM2 fire-api...')
    stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api 2>&1')
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    print(out if out else '(no output)')
    if err: print('ERR:', err)

    print('\nDeployment completed!')
finally:
    sftp.close()
    client.close()
