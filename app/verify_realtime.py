import paramiko
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=10)

# Get token
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
login_resp = stdout.read().decode('utf-8', errors='replace').strip()
print('Login raw:', login_resp[:100])
try:
    token = json.loads(login_resp)['data']['accessToken']
except Exception as e:
    print('Login parse error:', e)
    client.close()
    sys.exit(1)

# Test realtime
stdin, stdout, stderr = client.exec_command(f"curl -s http://127.0.0.1:5003/api/devices/status/realtime -H 'Authorization: Bearer {token}'")
rt = stdout.read().decode('utf-8', errors='replace')
print('Realtime raw:', rt[:200])
try:
    rt_data = json.loads(rt)
    print('Realtime code:', rt_data.get('code'))
    print('Realtime msg:', rt_data.get('msg'))
except:
    print('Realtime parse failed')

client.close()
