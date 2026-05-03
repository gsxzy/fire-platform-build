import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 查看 PM2 实时日志（只看最近的错误）
stdin, stdout, stderr = ssh.exec_command("pm2 logs fire-api --lines 10 --nostream 2>&1 | grep -E '(alarms list error|Error|error)'")
out = stdout.read().decode('utf-8', errors='replace')
print('=== ERROR LOGS ===')
print(out or '(no matching errors)')

# 用 node 直接测试模块加载
stdin, stdout, stderr = ssh.exec_command("cd /opt/my-fire-api && node -e \"const m = require('./fireHostApi'); console.log('loaded ok')\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== MODULE LOAD TEST ===')
print(out)

# 查看完整的 stdout 日志
stdin, stdout, stderr = ssh.exec_command("cat /root/.pm2/logs/fire-api-out.log 2>/dev/null | tail -n 30")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== PM2 OUT LOG ===')
print(out)

ssh.close()
