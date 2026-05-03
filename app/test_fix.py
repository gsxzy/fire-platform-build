import paramiko
import json
import sys
import time
sys.stdout.reconfigure(encoding='utf-8')

HOST = '124.223.35.58'
USER = 'root'
PASS = 'Zhangcong2255'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

try:
    time.sleep(2)
    stdin, stdout, stderr = client.exec_command("curl -s -X POST http://localhost:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'")
    login_res = stdout.read().decode('utf-8', errors='replace').strip()
    token = json.loads(login_res).get('data', {}).get('token', '')
    if token:
        cmds = [
            f"curl -s 'http://localhost:5003/api/devices/list?page=1&pageSize=10' -H 'Authorization: Bearer {token}'",
            f"curl -s 'http://localhost:5003/api/devices/stats/overview' -H 'Authorization: Bearer {token}'",
            f"curl -s 'http://localhost:5003/api/units/stats/overview' -H 'Authorization: Bearer {token}'",
        ]
        for cmd in cmds:
            stdin, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode('utf-8', errors='replace').strip()
            try:
                parsed = json.loads(out)
                print(f"\n{cmd.split(' ')[4]}:")
                print(json.dumps(parsed, ensure_ascii=False, indent=2)[:1000])
            except:
                print(out[:500])
    else:
        print('No token, login response:', login_res[:200])
finally:
    client.close()
