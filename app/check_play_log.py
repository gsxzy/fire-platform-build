import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=10)

# Trigger play
stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://127.0.0.1:18080/api/user/login?username=admin&password=21232f297a57a5a743894a0e4a801fc3'"
)
import json
resp = json.loads(stdout.read().decode('utf-8', errors='replace'))
token = resp['data']['accessToken']

stdin, stdout, stderr = client.exec_command(
    f"curl -s --max-time 10 'http://127.0.0.1:18080/api/play/start/34020000001300000001/34020000001320000001' -H 'access-token: {token}'"
)
print("Play:", stdout.read().decode('utf-8', errors='replace'))

# Get detailed logs
print("\n=== Detailed WVP logs ===")
stdin, stdout, stderr = client.exec_command(
    "tail -300 /opt/wvp/logs/wvp.log | grep -n -E '开始点播|点播失败|PlayService|ssrc|port|media|zlm| invite|INVITE|device|channel|在线|offline' | grep -v '185.206.148.231' | grep -v '15505267671' | tail -25"
)
for line in stdout.read().decode('utf-8', errors='replace').split('\n'):
    if line.strip():
        print(line[:400])

client.close()
