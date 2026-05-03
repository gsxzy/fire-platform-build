import paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

cmds = [
    "mysql -u root -p'Zhangcong2255' fire_platform -e 'DESCRIBE control_room_realtime' 2>/dev/null",
    "mysql -u root -p'Zhangcong2255' fire_platform -e 'SELECT * FROM control_room_realtime' 2>/dev/null",
    "mysql -u root -p'Zhangcong2255' fire_platform -e 'DESCRIBE fscn8001_device' 2>/dev/null",
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
