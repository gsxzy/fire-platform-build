import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 检查 systemd 状态
stdin, stdout, stderr = ssh.exec_command("systemctl status fscn8001.service --no-pager")
out = stdout.read().decode('utf-8', errors='replace')
print('=== SYSTEMD STATUS ===')
print(out)

# 检查最新日志
stdin, stdout, stderr = ssh.exec_command("tail -n 20 /var/log/fscn8001.log")
out = stdout.read().decode('utf-8', errors='replace')
print('=== APP LOG ===')
print(out)

ssh.close()
