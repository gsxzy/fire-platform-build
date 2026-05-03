import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

# Check WVP media server APIs
paths = [
    '/api/media_server/list',
    '/api/mediaServer/list',
    '/api/media/list',
    '/api/zlm/list',
    '/api/server/list',
]

print("=== WVP Media Server APIs ===")
for path in paths:
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -w '%{{http_code}}' -o /tmp/api.json 'http://127.0.0.1:18080{path}' -H 'access-token: {token}'"
    )
    code = stdout.read().decode('utf-8', errors='replace').strip()
    stdin, stdout, stderr = client.exec_command('cat /tmp/api.json')
    body = stdout.read().decode('utf-8', errors='replace')
    print(f"{path} -> {code}: {body[:200]}")

# Test ZLM API directly
print("\n=== ZLM API ===")
stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:8081/index/api/getApiList?secret=clKwNbLRJ1LgJ6xPcmd767mVX5xn5tgz' | head -c 300"
)
print(stdout.read().decode('utf-8', errors='replace'))

# Test ZLM keepalive simulation
print("\n=== ZLM keepalive ===")
stdin, stdout, stderr = client.exec_command(
    "curl -s -X POST 'http://127.0.0.1:18080/index/hook/on_server_keepalive' -H 'Content-Type: application/json' -d '{\"data\":{\"mediaServerId\":\"polaris\",\"ip\":\"124.223.35.58\",\"httpPort\":8081,\"rtmpPort\":10001,\"rtpProxyPort\":10003,\"rtspPort\":10002},\"hook_index\":1}'"
)
print(stdout.read().decode('utf-8', errors='replace')[:200])

client.close()
