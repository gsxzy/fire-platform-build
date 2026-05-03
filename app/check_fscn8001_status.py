import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

commands = [
    ("systemctl status fscn8001.service --no-pager", "服务状态"),
    ("tail -n 20 /var/log/fscn8001.log 2>/dev/null || echo 'NO_LOG'", "服务日志"),
    ("ss -tlnp | grep -E '520[015]'", "端口监听"),
    ("ps aux | grep fscn8001", "进程状态"),
]

results = []
for cmd, desc in commands:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    results.append(f"=== {desc} ===\n{out}\n{err}\n")

client.close()

with open('fscn8001_status.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
print('Status written to fscn8001_status.txt')
