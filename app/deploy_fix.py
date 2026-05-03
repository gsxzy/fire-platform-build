import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

# Upload modified files
files = [
    ('backend/gb26875Server.js', '/opt/my-fire-api/gb26875Server.js'),
    ('backend/utils/initDb.js', '/opt/my-fire-api/utils/initDb.js'),
]
for local, remote in files:
    sftp.put(local, remote)
    print(f'Uploaded: {local} -> {remote}')

sftp.close()

# Restart PM2
stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api 2>&1')
out = stdout.read().decode('utf-8', errors='replace').strip()
err = stderr.read().decode('utf-8', errors='replace').strip()
print('PM2 restart:', out[:500] if len(out) > 500 else out)
if err: print('ERR:', err[:500] if len(err) > 500 else err)

client.close()
print('Done!')
