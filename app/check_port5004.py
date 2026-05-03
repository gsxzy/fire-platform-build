import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 检查 5004 端口
stdin, stdout, stderr = ssh.exec_command("ss -tlnp | grep 5004")
out = stdout.read().decode('utf-8', errors='replace')
print('=== PORT 5004 ===')
print(out or '(not listening)')

# 测试 5004 响应
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5004/api/alarms")
out = stdout.read().decode('utf-8', errors='replace')
print('=== 5004 /api/alarms ===')
print(f'HTTP {out}')

# 检查 PM2 是否有 5004 端口的进程
stdin, stdout, stderr = ssh.exec_command("pm2 list | grep -v 'fire-api'")
out = stdout.read().decode('utf-8', errors='replace')
print('=== PM2 (other) ===')
print(out or '(none)')

ssh.close()
