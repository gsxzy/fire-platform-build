import paramiko, json
HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Test public auth endpoint
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/auth/login -X POST -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"123456\"}' 2>&1 | head -c 300")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('POST /api/auth/login:', out)

# Test units list via direct port
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/units/list?page=1&pageSize=1 2>&1 | head -c 300")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('GET /api/units/list:', out)

# Test POST /units with dry run (will likely fail auth but checks route exists)
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/units -X POST -H 'Content-Type: application/json' -d '{\"name\":\"test\"}' 2>&1 | head -c 300")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('POST /api/units (no auth):', out)

# Check nginx default.conf for /api proxy
stdin, stdout, stderr = client.exec_command("grep -A5 'location /api' /www/server/panel/vhost/nginx/0.default.conf 2>&1 | head -20")
out = stdout.read().decode('utf-8', errors='replace').strip()
print('Nginx /api location:', out)

client.close()
