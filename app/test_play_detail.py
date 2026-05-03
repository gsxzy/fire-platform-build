import paramiko, json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

# Try with different params
params_list = [
    '',
    '?streamId=34020000001320000001_34020000001300000001',
    '?ssrc=0200000001',
]

for params in params_list:
    stdin, stdout, stderr = client.exec_command(
        f"curl -s --max-time 10 'http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001320000001{params}' -H 'access-token: {token}'"
    )
    body = stdout.read().decode('utf-8', errors='replace')
    print(f"Params={params!r}: {body[:200]}")

# Check logs around this time
print("\n=== Relevant WVP logs ===")
stdin, stdout, stderr = client.exec_command(
    "tail -200 /opt/wvp/logs/wvp.log | grep -E '开始点播|PlayController|点播失败|参数|ssrc|stream| invite|INVITE' | tail -30"
)
for line in stdout.read().decode('utf-8', errors='replace').split('\n'):
    if '185.206.148.231' in line or '15505267671' in line:
        continue
    if line.strip():
        print(line[:300])

client.close()
