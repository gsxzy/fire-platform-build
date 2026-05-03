import paramiko, json, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

# Try play with longer timeout
print("=== 尝试播放 (30s timeout) ===")
stdin, stdout, stderr = client.exec_command(
    f"curl -s --max-time 30 'http://127.0.0.1:18080/api/play/start/34020000001300000001/2' -H 'access-token: {token}'"
)
body = stdout.read().decode('utf-8', errors='replace')
print(f"Response: {body[:800]}")

# Check WVP log for play attempt
print("\n=== WVP 最近日志 ===")
stdin, stdout, stderr = client.exec_command(
    "tail -30 /opt/wvp/logs/wvp.log | grep -i -E 'play|stream|zlm|media|rtp|invite' | tail -15"
)
print(stdout.read().decode('utf-8', errors='replace'))

client.close()
