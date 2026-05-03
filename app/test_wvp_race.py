import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Login to fire-api
stdin, stdout, stderr = client.exec_command(
    "curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

# Test fire-api /api/video/devices with various params
queries = [
    '',
    '?page=1&count=10',
    '?page=1&limit=10',
    '?page=1&count=100',
]

for q in queries:
    cmd = f"curl -s -w '%{{http_code}}' -o /tmp/fapi.json 'http://127.0.0.1:5003/api/video/devices{q}' -H 'Authorization: Bearer {token}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    code = stdout.read().decode('utf-8', errors='replace').strip()
    stdin, stdout, stderr = client.exec_command('cat /tmp/fapi.json')
    body = stdout.read().decode('utf-8', errors='replace')
    try:
        d = json.loads(body)
        biz = d.get('code', '?')
        msg = d.get('msg', d.get('message', '?'))[:30]
    except:
        biz = '?'
        msg = body[:50]
    ok = code == '200' and biz == 200
    print(f"{'OK' if ok else 'FAIL'} /api/video/devices{q} (http={code}, biz={biz}) msg={msg}")

# Now test WVP directly with same token
print("\n--- WVP Direct ---")
for q in queries:
    cmd = f"curl -s -w '%{{http_code}}' -o /tmp/wvp.json 'http://127.0.0.1:18080/api/device/query/devices{q}' -H 'access-token: {token}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    code = stdout.read().decode('utf-8', errors='replace').strip()
    stdin, stdout, stderr = client.exec_command('cat /tmp/wvp.json')
    body = stdout.read().decode('utf-8', errors='replace')
    try:
        d = json.loads(body)
        biz = d.get('code', '?')
        msg = d.get('msg', '?')[:30]
    except:
        biz = '?'
        msg = body[:50]
    ok = code == '200' and biz in (0, 200)
    print(f"{'OK' if ok else 'FAIL'} /api/device/query/devices{q} (http={code}, biz={biz}) msg={msg}")

client.close()
