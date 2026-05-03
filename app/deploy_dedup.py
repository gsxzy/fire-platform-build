import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15)

with open(r'D:\新致远智慧消防平台\fire-platform-build\app\sql\dedup_views.sql', 'r', encoding='utf-8') as f:
    content = f.read()
sftp = client.open_sftp()
with sftp.file('/opt/my-fire-api/sql/dedup_views.sql', 'w') as remote_file:
    remote_file.write(content)
sftp.close()

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

cmd = "mysql -u '{}' -p'{}' -h '{}' '{}' < /opt/my-fire-api/sql/dedup_views.sql".format(db_user, db_pass, db_host, db_name)
stdin, stdout, stderr = client.exec_command(cmd)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print('SQL stdout:', out)
if err:
    print('SQL stderr:', err)

client.close()
print('Done')
