import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 检查服务器上的后端代码
stdin, stdout, stderr = ssh.exec_command("grep -n \"router.get('/alarms'\" /opt/my-fire-api/fireHostApi.js")
out = stdout.read().decode('utf-8', errors='replace')
print('=== SERVER /alarms route ===')
print(out or '(NOT FOUND)')

stdin, stdout, stderr = ssh.exec_command("grep -n \"router.get('/control-rooms'\" /opt/my-fire-api/fireHostApi.js")
out = stdout.read().decode('utf-8', errors='replace')
print('=== SERVER /control-rooms route ===')
print(out or '(NOT FOUND)')

# 检查 server.js 是否加载了 fireHostApi
stdin, stdout, stderr = ssh.exec_command("grep -n 'fireHostApi' /opt/my-fire-api/server.js")
out = stdout.read().decode('utf-8', errors='replace')
print('=== SERVER server.js ===')
print(out or '(NOT FOUND)')

# 查看服务器文件修改时间
stdin, stdout, stderr = ssh.exec_command("ls -la /opt/my-fire-api/fireHostApi.js /opt/my-fire-api/server.js")
out = stdout.read().decode('utf-8', errors='replace')
print('=== FILE MTIME ===')
print(out)

ssh.close()
