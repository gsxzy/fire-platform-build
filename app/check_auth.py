import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=10)

# Check auth.js
stdin, stdout, stderr = client.exec_command("grep -n 'generateToken\|jwt.sign\|issuer' /opt/my-fire-api/routes/auth.js")
print('=== auth.js token ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Check middleware/auth.js
stdin, stdout, stderr = client.exec_command("grep -n 'issuer\|jwt.verify' /opt/my-fire-api/middleware/auth.js")
print('=== middleware/auth.js ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Test login API
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}' 2>&1 | head -1")
print('=== Login Response ===')
print(stdout.read().decode('utf-8', errors='replace'))

# Test workbench API with no token
stdin, stdout, stderr = client.exec_command("curl -s http://127.0.0.1:5003/api/dashboard/stats 2>&1 | head -1")
print('=== Dashboard (no auth) ===')
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
