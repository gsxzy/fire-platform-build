import paramiko, json, time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Login
stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

# Trigger play
stdin, stdout, stderr = client.exec_command(
    f"curl -s --max-time 10 'http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001320000001' -H 'access-token: {token}'"
)
body = stdout.read().decode('utf-8', errors='replace')
print(f"Play response: {body}")

# Wait and check logs
time.sleep(2)
stdin, stdout, stderr = client.exec_command(
    "tail -80 /opt/wvp/logs/wvp.log"
)
logs = stdout.read().decode('utf-8', errors='replace').split('\n')

# Filter relevant lines
for line in logs:
    if '185.206.148.231' in line or '15505267671' in line:
        continue
    if any(k in line for k in ['开始点播', 'invite', 'ssrc', 'port', 'stream', 'error', 'fail', 'success', 'zlm', 'media', '通道', 'play']):
        print(line.strip()[:300])

client.close()
