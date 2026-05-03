import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

files = [
    ('/opt/my-fire-api/sql/rbac_tables.sql', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\sql\rbac_tables.sql'),
    ('/opt/my-fire-api/services/rbac.service.js', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\services\rbac.service.js'),
    ('/opt/my-fire-api/middleware/permission.js', r'D:\新致远智慧消防平台\fire-platform-build\app\backend\middleware\permission.js'),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)

client.exec_command('mkdir -p /opt/my-fire-api/sql /opt/my-fire-api/services /opt/my-fire-api/middleware')

sftp = client.open_sftp()
for remote, local in files:
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

cmd = "mysql -u '{}' -p'{}' -h '{}' '{}' < /opt/my-fire-api/sql/rbac_tables.sql".format(db_user, db_pass, db_host, db_name)
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('SQL stdout:', out)
if err:
    print('SQL stderr:', err)

client.close()
print('Done')
