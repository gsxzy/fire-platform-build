import paramiko
key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# 1. 后端最近日志（看有无报错）
stdin, stdout, stderr = ssh.exec_command("pm2 logs fire-api --lines 50 --nostream 2>&1 | tail -n 50")
out = stdout.read().decode('utf-8', errors='replace')
print('=== BACKEND LOGS (recent) ===')
print(out[-2000:] if len(out) > 2000 else out)

# 2. 检查 /var/log/fscn8001.log 是否有异常
stdin, stdout, stderr = ssh.exec_command("tail -n 30 /var/log/fscn8001.log 2>/dev/null")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== FSCN8001 LOGS ===')
print(out)

# 3. 数据库连接测试
stdin, stdout, stderr = ssh.exec_command("mysql -u root -e \"SELECT COUNT(*) FROM fire_platform.fscn8001_alarm;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== DB ALARM COUNT ===')
print(out)

stdin, stdout, stderr = ssh.exec_command("mysql -u root -e \"SELECT COUNT(*) FROM fire_platform.control_room_realtime;\" 2>&1")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== DB CONTROL ROOM COUNT ===')
print(out)

# 4. 检查 Nginx access log 看前端请求了什么
stdin, stdout, stderr = ssh.exec_command("tail -n 30 /www/server/nginx/logs/access.log 2>/dev/null | grep -E '(alarms|control-rooms|devices|dashboard|fire-hosts)'")
out = stdout.read().decode('utf-8', errors='replace')
print('\n=== NGINX ACCESS LOG (API calls) ===')
print(out or '(no matching access logs)')

ssh.close()
