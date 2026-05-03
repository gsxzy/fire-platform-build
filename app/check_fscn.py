import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

stdin, stdout, stderr = ssh.exec_command("grep -n 'const PORT' /opt/fsan/fscn8001.js")
out = stdout.read().decode('utf-8', errors='replace')
print(out)

stdin, stdout, stderr = ssh.exec_command("iptables -t nat -L PREROUTING -n --line-numbers | grep 5201")
out = stdout.read().decode('utf-8', errors='replace')
print('=== IPTABLES ===')
print(out or '(no rule)')

ssh.close()
