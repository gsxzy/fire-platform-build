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

# Get line number of the play start log
stdin, stdout, stderr = client.exec_command(
    "grep -n '点播开始.*34020000001300000001' /opt/wvp/logs/wvp.log | tail -1"
)
line_info = stdout.read().decode('utf-8', errors='replace').strip()
print(f"\nStart line: {line_info[:100]}")

if ':' in line_info:
    line_num = int(line_info.split(':')[0])
    stdin, stdout, stderr = client.exec_command(f"sed -n '{line_num},{line_num+30}p' /opt/wvp/logs/wvp.log")
    for l in stdout.read().decode('utf-8', errors='replace').split('\n'):
        if '185.206.148.231' in l or '15505267671' in l:
            continue
        if l.strip():
            print(l[:400])

client.close()
