import paramiko, json, sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Login
stdin, stdout, stderr = client.exec_command(
    "curl -s -X POST http://127.0.0.1:5003/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

print(f"Token: {token[:20]}...")

# Test video devices via proxy (what frontend actually calls)
endpoints = [
    '/api/video/devices',
    '/api/video/devices?page=1&limit=10',
    '/api/gb28181-devices',
    '/api/gb28181-devices/list',
    '/api/cameras/list',
]

all_ok = True
for ep in endpoints:
    cmd = f"curl -s -w '%{{http_code}}' -o /tmp/resp.json 'http://127.0.0.1:5003{ep}' -H 'Authorization: Bearer {token}'"
    stdin, stdout, stderr = client.exec_command(cmd)
    code = stdout.read().decode('utf-8', errors='replace').strip()
    stdin, stdout, stderr = client.exec_command('cat /tmp/resp.json')
    body = stdout.read().decode('utf-8', errors='replace')
    try:
        d = json.loads(body)
        biz = d.get('code', '?')
    except:
        biz = '?'
    ok = code == '200' and biz == 200
    if not ok:
        all_ok = False
    print(f"{'OK' if ok else 'FAIL'} {ep} (http={code}, biz={biz})")

# Also check backend log for errors
stdin, stdout, stderr = client.exec_command(
    "pm2 logs fire-api --lines 5 --nostream --timestamp 2>/dev/null || journalctl -u fire-api -n 5 --no-pager 2>/dev/null || echo 'log not available'"
)
print(f"\nBackend recent logs:\n{stdout.read().decode('utf-8', errors='replace')}")

client.close()
print(f"\n{'ALL PASSED' if all_ok else 'SOME FAILED'}")
sys.exit(0 if all_ok else 1)
