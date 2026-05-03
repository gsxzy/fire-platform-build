import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Get token
stdin, stdout, stderr = client.exec_command("curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
token = json.loads(stdout.read().decode('utf-8', errors='replace'))['data']['accessToken']

# Test create unit
payload = {
    "name": "测试单位",
    "type": "general",
    "address": "测试地址",
    "contact_name": "测试联系人",
    "contact_phone": "13800138000"
}

stdin, stdout, stderr = client.exec_command(
    f"curl -s -X POST http://127.0.0.1:5003/api/units -H 'Content-Type: application/json' -H 'Authorization: Bearer {token}' -d '{json.dumps(payload, ensure_ascii=False)}'"
)
resp = stdout.read().decode('utf-8', errors='replace')
print('POST /api/units response:')
print(resp)

try:
    data = json.loads(resp)
    print(f"Code: {data.get('code')}, Msg: {data.get('msg')}")
except Exception as e:
    print(f"Parse error: {e}")
    print(resp[:200])

client.close()
