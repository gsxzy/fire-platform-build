import paramiko
import json

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

def run_cmd(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    return stdout.read().decode('utf-8', errors='replace').strip()

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

output_lines = []

# 1. Login to get token
login_cmd = "curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
login_res = run_cmd(client, login_cmd)
output_lines.append('=== Login ===')
output_lines.append(login_res)

try:
    login_data = json.loads(login_res)
    token = login_data.get('data', {}).get('token', '')
    output_lines.append(f"Token: {token[:30]}..." if token else "No token!")
except:
    token = ''

if token:
    # 2. Create a test device
    create_cmd = f"curl -s -X POST http://127.0.0.1:5003/api/devices -H 'Content-Type: application/json' -H 'Authorization: Bearer {token}' -d '{json.dumps({'id': 'TEST-DEV-001', 'name': '测试设备001', 'type': 'detector', 'unitId': 'UNIT-001', 'unitName': '测试单位', 'location': '1F大厅', 'status': 'normal', 'onlineStatus': 'online'})}'"
    create_res = run_cmd(client, create_cmd)
    output_lines.append('=== Create Device ===')
    output_lines.append(create_res)

    # 3. List devices
    list_cmd = f"curl -s 'http://127.0.0.1:5003/api/devices?page=1&pageSize=5' -H 'Authorization: Bearer {token}'"
    list_res = run_cmd(client, list_cmd)
    output_lines.append('=== List Devices ===')
    output_lines.append(list_res)

    # 4. Delete the test device
    delete_cmd = f"curl -s -X DELETE http://127.0.0.1:5003/api/devices/TEST-DEV-001 -H 'Authorization: Bearer {token}'"
    delete_res = run_cmd(client, delete_cmd)
    output_lines.append('=== Delete Device ===')
    output_lines.append(delete_res)

    # 5. Verify deletion
    list_res2 = run_cmd(client, list_cmd)
    output_lines.append('=== List After Delete ===')
    output_lines.append(list_res2)

client.close()

with open('archive_delete_test.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines))
print('Archive delete test written to archive_delete_test.txt')
