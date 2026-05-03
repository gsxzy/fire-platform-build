import sys, paramiko
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('124.223.35.58', username='root', password='Zhangcong2255', timeout=30)
cmds = [
    '/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api',
    'sleep 2 && /www/server/nodejs/v20.20.0/bin/pm2 list',
    'curl -s http://127.0.0.1:5003/health',
    'curl -s http://127.0.0.1:5003/api/commands/recent -H "Authorization: Bearer test" | head -c 100',
]
for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    safe_out = out.encode('ascii', 'replace').decode('ascii')
    safe_err = err.encode('ascii', 'replace').decode('ascii')
    print(f'=== {cmd} ===')
    print(safe_out if safe_out else '(empty)')
    if safe_err: print(f'ERR: {safe_err}')
    print()
client.close()
