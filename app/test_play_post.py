import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

# Try POST
print("=== POST /api/play/start ===")
stdin, stdout, stderr = client.exec_command(
    f"curl -s --max-time 10 -X POST 'http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001320000001' -H 'access-token: {token}'"
)
print("Result:", stdout.read().decode('utf-8', errors='replace')[:300])

# Try GET
print("\n=== GET /api/play/start ===")
stdin, stdout, stderr = client.exec_command(
    f"curl -s --max-time 10 'http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001320000001' -H 'access-token: {token}'"
)
print("Result:", stdout.read().decode('utf-8', errors='replace')[:300])

# Check what methods PlayController supports by looking at WVP source or trying other endpoints
print("\n=== WVP API options ===")
for method in ['GET', 'POST']:
    stdin, stdout, stderr = client.exec_command(
        f"curl -s -X {method} -w '%{{http_code}}' -o /dev/null 'http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001320000001' -H 'access-token: {token}'"
    )
    print(f"{method}: {stdout.read().decode('utf-8', errors='replace').strip()}")

client.close()
