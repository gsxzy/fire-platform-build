import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

commands = [
    ("curl -s 'http://127.0.0.1:5003/api/fscn8001/alarms?page=1&pageSize=5'", "报警查询API"),
    ("curl -s 'http://127.0.0.1:5003/api/fscn8001/devices?page=1&pageSize=5'", "设备查询API"),
    ("curl -s 'http://127.0.0.1:5003/api/fscn8001/raw-logs?page=1&pageSize=5'", "原始报文查询API"),
]

results = []
for cmd, desc in commands:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    results.append(f"=== {desc} ===\n{out[:800]}\n{err}\n")

client.close()

with open('frontend_api_check.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print('Frontend API check written to frontend_api_check.txt')
