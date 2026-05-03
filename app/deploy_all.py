import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

backend_files = [
    ('/opt/my-fire-api/utils/db.js', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\utils\db.js'),
    ('/opt/my-fire-api/fireHostApi.js', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\fireHostApi.js'),
    ('/opt/my-fire-api/routes/deviceControl.js', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\routes\deviceControl.js'),
    ('/opt/my-fire-api/routes/device.js', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\routes\device.js'),
    ('/opt/my-fire-api/routes/unit.js', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\routes\unit.js'),
    ('/opt/my-fire-api/package.json', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\package.json'),
    ('/opt/my-fire-api/sql/rbac_tables.sql', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\sql\rbac_tables.sql'),
    ('/opt/my-fire-api/sql/fix_user_id_type.sql', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\sql\fix_user_id_type.sql'),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)

sftp = client.open_sftp()
for remote, local in backend_files:
    with open(local, 'r', encoding='utf-8') as f:
        content = f.read()
    with sftp.file(remote, 'w') as remote_file:
        remote_file.write(content)
    print('Uploaded', remote)
sftp.close()

# Read .env
stdin, stdout, stderr = client.exec_command('cat /opt/my-fire-api/.env')
env_content = stdout.read().decode('utf-8', errors='replace')
env = {}
for line in env_content.splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        env[k] = v

db_user = env.get('DB_USER', 'root')
db_pass = env.get('DB_PASSWORD', '')
db_host = env.get('DB_HOST', 'localhost')
db_name = env.get('DB_NAME', 'fire_platform')

# Execute SQL fix
cmd = "mysql -u '{}' -p'{}' -h '{}' '{}' < /opt/my-fire-api/sql/fix_user_id_type.sql".format(db_user, db_pass, db_host, db_name)
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('SQL stdout:', out)
if err:
    print('SQL stderr:', err)

# Install missing backend deps
stdin, stdout, stderr = client.exec_command('cd /opt/my-fire-api && npm install')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('npm install stdout:', out[-500:] if len(out) > 500 else out)
if err:
    print('npm install stderr:', err[-500:] if len(err) > 500 else err)

# Restart PM2
stdin, stdout, stderr = client.exec_command('/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api --update-env')
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('PM2 stdout:', out)
if err:
    print('PM2 stderr:', err)

client.close()
print('Deploy done')
