#!/usr/bin/env python3
import paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
REMOTE_DIR = "/www/wwwroot/fire-platform"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

cmds = [
    f'echo "=== Old backups ==="',
    f'ls -ld {REMOTE_DIR}.bak.* 2>/dev/null || echo "No old backups"',
    f'rm -rf {REMOTE_DIR}.bak.*',
    f'echo "=== Backup cleaned ==="',
    f'echo "=== Nginx cache ==="',
    f'rm -rf /www/server/nginx/proxy_cache_dir/* 2>/dev/null || true',
    f'rm -rf /www/server/nginx/fastcgi_cache/* 2>/dev/null || true',
    f'echo "=== Cache cleaned ==="',
    f'echo "=== Current files ==="',
    f'ls -la {REMOTE_DIR}/',
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err:
        print(f"ERR: {err}")

client.close()
print("\nServer cleanup completed!")
