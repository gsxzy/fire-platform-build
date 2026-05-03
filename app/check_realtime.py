import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=10)

# Get token
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}' | python3 -c 'import sys,json; print(json.load(sys.stdin)[\"data\"][\"accessToken\"])'")
token = stdout.read().decode('utf-8', errors='replace').strip()

# Call realtime endpoint
stdin, stdout, stderr = client.exec_command(f"curl -s http://127.0.0.1:5003/api/devices/status/realtime -H 'Authorization: Bearer {token}'")
print('Response:', stdout.read().decode('utf-8', errors='replace'))

# Check backend error log
stdin, stdout, stderr = client.exec_command('cat /root/.pm2/logs/fire-api-error.log 2>/dev/null | tail -30')
err_log = stdout.read().decode('utf-8', errors='replace')
if err_log.strip():
    print('Error log:', err_log)

# Check which file handles /api/devices/status/realtime
stdin, stdout, stderr = client.exec_command("grep -rn 'status/realtime' /opt/my-fire-api/routes/ /opt/my-fire-api/fireHostApi.js 2>/dev/null")
print('File match:', stdout.read().decode('utf-8', errors='replace'))

client.close()
