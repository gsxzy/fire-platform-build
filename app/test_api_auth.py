import paramiko
import sys
import json
sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

try:
    # Login to get token
    stdin, stdout, stderr = client.exec_command(
        "curl -s -X POST http://localhost:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
    )
    login_res = stdout.read().decode('utf-8', errors='replace').strip()
    print("Login:", login_res[:500])
    token_data = json.loads(login_res)
    token = token_data.get('data', {}).get('accessToken', '') or token_data.get('data', {}).get('token', '')
    
    if token:
        cmds = [
            f"curl -s 'http://localhost:5003/api/units/list?page=1&pageSize=5' -H 'Authorization: Bearer {token}'",
            f"curl -s 'http://localhost:5003/api/devices/list?page=1&pageSize=5' -H 'Authorization: Bearer {token}'",
            f"curl -s 'http://localhost:5003/api/devices/stats/overview' -H 'Authorization: Bearer {token}'",
            f"curl -s 'http://localhost:5003/api/units/stats/overview' -H 'Authorization: Bearer {token}'",
        ]
        for cmd in cmds:
            stdin, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode('utf-8', errors='replace').strip()
            print(f"\n{cmd.split(' ')[4]}:")
            try:
                parsed = json.loads(out)
                print(json.dumps(parsed, ensure_ascii=False, indent=2)[:1200])
            except:
                print(out[:500])
    else:
        print("No token obtained")
finally:
    client.close()
