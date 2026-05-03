import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

# Try play with channel id=2
stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:18080/api/play/start/34020000001300000001/2' -H 'access-token: {token}'"
)
body = stdout.read().decode('utf-8', errors='replace')
print(f"Play with id=2: {body[:500]}")

# Also try with deviceId itself as channelId
stdin, stdout, stderr = client.exec_command(
    f"curl -s 'http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001300000001' -H 'access-token: {token}'"
)
body2 = stdout.read().decode('utf-8', errors='replace')
print(f"Play with deviceId: {body2[:500]}")

client.close()
