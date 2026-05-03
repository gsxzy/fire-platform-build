import paramiko, json, sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

# 1. Login to get token
stdin, stdout, stderr = client.exec_command(
    "curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
)
login_res = stdout.read().decode('utf-8', errors='replace').strip()
print(f'=== Login ===')
print(login_res[:300])
print()

try:
    token_data = json.loads(login_res)
    access_token = token_data.get('data', {}).get('accessToken', '') or token_data.get('data', {}).get('token', '')
except:
    access_token = ''

if access_token:
    print(f'Token obtained: {access_token[:30]}...')
    print()
    
    # Test floor plan APIs
    apis = [
        f"curl -s http://127.0.0.1:5003/api/buildings -H 'Authorization: Bearer {access_token}'",
        f"curl -s 'http://127.0.0.1:5003/api/floors?building_id=1' -H 'Authorization: Bearer {access_token}'",
        f"curl -s http://127.0.0.1:5003/api/floors/1 -H 'Authorization: Bearer {access_token}'",
        f"curl -s http://127.0.0.1:5003/api/floors/1/devices -H 'Authorization: Bearer {access_token}'",
        f"curl -s http://127.0.0.1:5003/api/floors/1/devices/unmarked -H 'Authorization: Bearer {access_token}'",
        f"curl -s http://127.0.0.1:5003/api/devices/SMOKE_001/position -H 'Authorization: Bearer {access_token}'",
    ]
    
    for cmd in apis:
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        safe = out.encode('ascii', 'replace').decode('ascii')
        print(f'=== {cmd[:80]}... ===')
        print(safe[:300] if safe else '(empty)')
        if err: print(f'ERR: {err}')
        print()
else:
    print('Failed to get token')

client.close()
