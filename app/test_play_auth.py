import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Fresh login
stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']
print(f"Token: {token[:30]}...")

# Test play
stdin, stdout, stderr = client.exec_command(
    f"curl -s --max-time 15 'http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001320000001' -H 'access-token: {token}'"
)
body = stdout.read().decode('utf-8', errors='replace')
print(f"Play: {body}")

# Check WVP log
print("\n=== WVP 播放日志 ===")
stdin, stdout, stderr = client.exec_command(
    "tail -100 /opt/wvp/logs/wvp.log | grep -E '开始点播|点播失败|Forbidden|play|ssrc|stream|zlm|media|invite|sdp' | grep -v '185.206.148.231' | grep -v '15505267671' | tail -10"
)
for line in stdout.read().decode('utf-8', errors='replace').split('\n'):
    if line.strip():
        print(line[:300])

client.close()
