import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)

cmds = [
    'netstat -tlnp | grep 5003 || ss -tlnp | grep 5003',
    'curl -s http://127.0.0.1:5003/health | head -c 200',
    'curl -s http://127.0.0.1:5003/api/buildings -H "Authorization: Bearer test" | head -c 200',
    'cat /opt/my-fire-api/logs/*.log 2>/dev/null | tail -20',
]
for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    print(f'=== {cmd} ===')
    print(out if out else '(empty)')
    if err and 'Connection refused' not in err and 'No such file' not in err:
        print(f'ERR: {err}')
    print()
client.close()
