import paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

cmds = [
    "mysql -u root -p'Zhangcong2255' fire_platform -e 'SELECT id, device_sn, device_name, ip, port, status, last_heartbeat, login_time FROM fscn8001_device ORDER BY last_heartbeat DESC LIMIT 10' 2>/dev/null",
    "mysql -u root -p'Zhangcong2255' fire_platform -e 'SELECT COUNT(*) as total, status FROM fscn8001_device GROUP BY status' 2>/dev/null",
    "ss -tn | grep :5205 || echo 'No 5205 connections'",
    "ps aux | grep fscn8001 | grep -v grep",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(f"=== {cmd} ===")
    for line in (out + err).split('\n'):
        safe = ''.join(c if ord(c) < 128 else '?' for c in line)
        print(safe)
    print()

client.close()
