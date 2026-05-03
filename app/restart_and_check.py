import paramiko
import time

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# 1. Add JWT_SECRET to .env if missing
print("=== 检查并设置 JWT_SECRET ===")
stdin, stdout, stderr = client.exec_command("grep '^JWT_SECRET=' /opt/my-fire-api/.env || echo NOT_FOUND")
out = stdout.read().decode('utf-8', errors='replace').strip()
if 'NOT_FOUND' in out or 'JWT_SECRET=\n' in out or not out:
    stdin, stdout, stderr = client.exec_command("echo 'JWT_SECRET=fire-platform-jwt-secret-2026' >> /opt/my-fire-api/.env")
    stdout.channel.recv_exit_status()
    print("Added JWT_SECRET")
else:
    print("JWT_SECRET already set:", out)

# 2. Restart fire-api with --update-env
print("\n=== 重启 fire-api ===")
stdin, stdout, stderr = client.exec_command("cd /opt/my-fire-api && pm2 restart fire-api --update-env")
stdout.channel.recv_exit_status()
out = stdout.read().decode('utf-8', errors='replace')
for line in out.split('\n'):
    safe = ''.join(c if ord(c) < 128 else '?' for c in line)
    print(safe)

# 3. Wait and check
print("\n等待 5 秒...")
time.sleep(5)

stdin, stdout, stderr = client.exec_command("pm2 describe fire-api")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== PM2 Status ===")
for line in out.split('\n'):
    safe = ''.join(c if ord(c) < 128 else '?' for c in line)
    print(safe)

stdin, stdout, stderr = client.exec_command("ss -tlnp | grep 5003 || echo 'Port 5003 not listening'")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== Port 5003 ===")
for line in out.split('\n'):
    safe = ''.join(c if ord(c) < 128 else '?' for c in line)
    print(safe)

client.close()
