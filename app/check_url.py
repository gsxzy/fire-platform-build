import paramiko

key = paramiko.Ed25519Key.from_private_key_file(r'C:\Users\Huawei\.ssh\id_ed25519')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('124.223.35.58', username='root', pkey=key, timeout=15)

# Test accessing the URL
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/login')
print('http://127.0.0.1/login status:', stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1/login | head -n 5')
print('http://127.0.0.1/login body:')
print(stdout.read().decode())

# Check nginx error log
stdin, stdout, stderr = ssh.exec_command('tail -n 10 /www/wwwlogs/fire-platform.error.log 2>/dev/null || tail -n 10 /www/wwwlogs/xzyzh.top.error.log 2>/dev/null')
print('Recent nginx errors:')
print(stdout.read().decode())

# Check if index.html exists and is readable
stdin, stdout, stderr = ssh.exec_command('ls -la /www/wwwroot/fire-platform/index.html')
print('index.html:', stdout.read().decode())

ssh.close()
