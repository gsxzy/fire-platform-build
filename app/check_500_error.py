import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 查看最近的错误日志
stdin, stdout, stderr = ssh.exec_command("pm2 logs fire-api --lines 20 --nostream 2>&1 | tail -n 20")
out = stdout.read().decode('utf-8', errors='replace')
print('=== RECENT ERRORS ===')
print(out)

# 直接测试 alarms/list 看详细错误
stdin, stdout, stderr = ssh.exec_command("curl -s -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NDU5OTg0MDAsImV4cCI6MTc0NjA4NDgwMH0.test' 'http://127.0.0.1:5003/api/alarms/list?pageSize=5' 2>&1")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== DIRECT TEST ===')
print(out)

ssh.close()
