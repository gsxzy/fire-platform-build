import paramiko
import time

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Change JWT_SECRET back to the fallback value
stdin, stdout, stderr = client.exec_command("sed -i 's/JWT_SECRET=.*/JWT_SECRET=fire-platform-jwt-secret-dev-only/' /opt/my-fire-api/.env")
stdout.channel.recv_exit_status()

stdin, stdout, stderr = client.exec_command("grep JWT_SECRET /opt/my-fire-api/.env")
out = stdout.read().decode('utf-8', errors='replace').strip()
print("JWT_SECRET:", out)

# Restart with update-env
stdin, stdout, stderr = client.exec_command("cd /opt/my-fire-api && pm2 restart fire-api --update-env")
stdout.channel.recv_exit_status()
print("fire-api restarted")

time.sleep(3)
stdin, stdout, stderr = client.exec_command("pm2 describe fire-api | grep status")
out = stdout.read().decode('utf-8', errors='replace')
for line in out.split('\n'):
    safe = ''.join(c if ord(c) < 128 else '?' for c in line)
    print(safe)

client.close()
