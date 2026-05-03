import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Get WVP token
stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

# Check media_server table
print("=== WVP media_server 表 ===")
stdin, stdout, stderr = client.exec_command(
    "mysql -h127.0.0.1 -P3307 -uroot -p'wvp@2024' -e 'SELECT * FROM wvp_media_server;' wvp 2>/dev/null"
)
print(stdout.read().decode('utf-8', errors='replace').strip())

# Get device channels
print("\n=== 通道数据结构 ===")
stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:18080/api/device/query/devices/34020000001300000001/channels?page=1&count=10' -H 'access-token: {token}'"
)
body = stdout.read().decode('utf-8', errors='replace')
try:
    d = json.loads(body)
    channels = d.get('data', {}).get('list', [])
    if channels:
        ch = channels[0]
        print(f"通道字段: {list(ch.keys())}")
        print(f"通道数据: {json.dumps(ch, indent=2, ensure_ascii=False)[:600]}")
    else:
        print("无通道")
except:
    print(body[:300])

# Try to find correct API for media server
print("\n=== WVP API 探测 ===")
for path in ['/api/server/all', '/api/mediaServer/all', '/api/media/all', '/api/media_server/list']:
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -w '%{{http_code}}' -o /tmp/api.json 'http://127.0.0.1:18080{path}' -H 'access-token: {token}'"
    )
    code = stdout.read().decode('utf-8', errors='replace').strip()
    stdin, stdout, stderr = client.exec_command('cat /tmp/api.json')
    body = stdout.read().decode('utf-8', errors='replace')
    print(f"{path} -> {code}: {body[:100]}")

client.close()
