import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 读取服务器上 /alarms 路由附近代码
stdin, stdout, stderr = ssh.exec_command("sed -n '1010,1035p' /opt/my-fire-api/fireHostApi.js")
out = stdout.read().decode('utf-8', errors='replace')
print('=== /alarms route (server) ===')
print(out)

# 读取 /alarms/stats
stdin, stdout, stderr = ssh.exec_command("sed -n '1085,1100p' /opt/my-fire-api/fireHostApi.js")
out = stdout.read().decode('utf-8', errors='replace')
print('=== /alarms/stats route (server) ===')
print(out)

# 检查是否有其他路由可能匹配 /alarms
stdin, stdout, stderr = ssh.exec_command("grep -n \"router\.(get|post|put|delete).*/alarms\" /opt/my-fire-api/fireHostApi.js")
out = stdout.read().decode('utf-8', errors='replace')
print('=== All /alarms routes ===')
print(out)

# 用 curl 直接测试（带和不带 token）
stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5003/api/alarms")
out = stdout.read().decode('utf-8', errors='replace')
print('=== Direct /api/alarms ===')
print(f'HTTP {out}')

stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5003/api/control-rooms")
out = stdout.read().decode('utf-8', errors='replace')
print('=== Direct /api/control-rooms ===')
print(f'HTTP {out}')

# 测试 /api/health
stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:5003/api/health")
out = stdout.read().decode('utf-8', errors='replace')
print('=== Direct /api/health ===')
print(out)

ssh.close()
