import paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# 1. Fix .env - add DB_PASSWORD
print("=== 修复 /opt/my-fire-api/.env ===")
stdin, stdout, stderr = client.exec_command("cat /opt/my-fire-api/.env")
env_content = stdout.read().decode('utf-8', errors='replace')
print("Before:")
for line in env_content.split('\n'):
    safe = ''.join(c if ord(c) < 128 else '?' for c in line)
    print(safe)

# Update .env to add DB_PASSWORD
if 'DB_PASSWORD=' in env_content and 'DB_PASSWORD=\n' in env_content:
    stdin, stdout, stderr = client.exec_command("sed -i 's/DB_PASSWORD=/DB_PASSWORD=Zhangcong2255/' /opt/my-fire-api/.env")
    stdout.channel.recv_exit_status()
    print("Updated DB_PASSWORD")
elif 'DB_PASSWORD=' not in env_content:
    stdin, stdout, stderr = client.exec_command("echo 'DB_PASSWORD=Zhangcong2255' >> /opt/my-fire-api/.env")
    stdout.channel.recv_exit_status()
    print("Added DB_PASSWORD")
else:
    print("DB_PASSWORD already set")

# Verify
stdin, stdout, stderr = client.exec_command("cat /opt/my-fire-api/.env")
env_content = stdout.read().decode('utf-8', errors='replace')
print("After:")
for line in env_content.split('\n'):
    safe = ''.join(c if ord(c) < 128 else '?' for c in line)
    print(safe)

# 2. Restart fire-api
print("\n=== 重启 fire-api ===")
stdin, stdout, stderr = client.exec_command("cd /opt/my-fire-api && pm2 restart fire-api 2>/dev/null || pm2 start server.js --name fire-api")
exit_status = stdout.channel.recv_exit_status()
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
for line in (out + err).split('\n'):
    safe = ''.join(c if ord(c) < 128 else '?' for c in line)
    print(safe)

# 3. Wait a bit and check status
import time
time.sleep(3)

stdin, stdout, stderr = client.exec_command("pm2 describe fire-api")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== PM2 Status ===")
for line in out.split('\n'):
    safe = ''.join(c if ord(c) < 128 else '?' for c in line)
    print(safe)

# 4. Check if port 5003 is now listening
stdin, stdout, stderr = client.exec_command("ss -tlnp | grep 5003 || echo 'Port 5003 not listening'")
out = stdout.read().decode('utf-8', errors='replace')
print("\n=== Port 5003 ===")
for line in out.split('\n'):
    safe = ''.join(c if ord(c) < 128 else '?' for c in line)
    print(safe)

client.close()
