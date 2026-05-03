import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 检查 5206 被什么占用
stdin, stdout, stderr = ssh.exec_command("ss -tlnp | grep 5206")
out = stdout.read().decode('utf-8', errors='replace')
print('=== PORT 5206 ===')
print(out or '(not listening)')

# 检查 5205
stdin, stdout, stderr = ssh.exec_command("ss -tlnp | grep 5205")
out = stdout.read().decode('utf-8', errors='replace')
print('=== PORT 5205 ===')
print(out or '(not listening)')

# 检查所有 node 进程
stdin, stdout, stderr = ssh.exec_command("ps aux | grep node | grep -v grep")
out = stdout.read().decode('utf-8', errors='replace')
print('=== NODE PROCESSES ===')
print(out or '(no node processes)')

ssh.close()
