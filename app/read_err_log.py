import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 读取 PM2 错误日志
stdin, stdout, stderr = ssh.exec_command('tail -n 30 /opt/my-fire-api/logs/err.log')
out = stdout.read().decode('utf-8', errors='replace')
print('=== ERR LOG ===')
print(out or '(empty)')

# 读取 PM2 输出日志（最近的 alarms/list 调用）
stdin, stdout, stderr = ssh.exec_command("tail -n 50 /opt/my-fire-api/logs/out.log | grep -E '(alarms|error|Error)'")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== OUT LOG (filtered) ===')
print(out or '(empty)')

ssh.close()
