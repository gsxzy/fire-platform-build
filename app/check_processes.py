import paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

cmds = [
    "ls -la /proc/1826154/cwd 2>/dev/null || echo PID_NOT_FOUND",
    "ls -la /proc/1830437/cwd 2>/dev/null || echo PID_NOT_FOUND",
    "ls -la /proc/1844345/cwd 2>/dev/null || echo PID_NOT_FOUND",
    "cat /proc/1826154/environ 2>/dev/null | tr '\\0' '\\n' | grep -E 'PORT|DB_|NODE_ENV' || echo NO_ENV",
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
