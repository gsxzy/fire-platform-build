import paramiko
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Test POST login
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"123456\"}' 2>&1 | head -c 300")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('POST /api/auth/login:', out)

# Test GET fscn8001 alarms
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/fscn8001/alarms?page=1&pageSize=1 2>&1 | head -c 300")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('GET /api/fscn8001/alarms:', out)

# Test GET fscn8001 devices
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/fscn8001/devices?page=1&pageSize=1 2>&1 | head -c 300")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('GET /api/fscn8001/devices:', out)

# Check nginx still proxying to 5003
stdin, stdout, stderr = client.exec_command("grep 'proxy_pass' /www/server/panel/vhost/nginx/0.default.conf | grep api")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Nginx proxy:', out)

# Check fscn8001Server logs for any errors
stdin, stdout, stderr = client.exec_command("/www/server/nodejs/v20.20.0/bin/pm2 logs fire-api --lines 20 2>&1 | tail -30")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Recent logs:', out[-500:] if len(out) > 500 else out)

client.close()
