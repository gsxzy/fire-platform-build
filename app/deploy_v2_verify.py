#!/usr/bin/env python3
import os, sys, paramiko

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
BACKEND_REMOTE = "/opt/my-fire-api"

log_lines = []
def safe_print(s):
    s = s.encode('ascii', 'replace').decode('ascii')
    print(s)
    log_lines.append(s)

def run_cmd(client, cmd, desc=""):
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', 'ignore').strip()
    err = stderr.read().decode('utf-8', 'ignore').strip()
    if desc:
        safe_print(f"[{desc}] exit={exit_status}")
    if out:
        safe_print(f"  OUT: {out[:800]}")
    if err and 'warn' not in err.lower():
        safe_print(f"  ERR: {err[:800]}")
    return exit_status, out, err

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

safe_print("=== Verifying deployment ===")
run_cmd(client, "pm2 list", "pm2 status")
run_cmd(client, "ss -tlnp | grep -E '5003|5004|5200|5201'", "ports")
run_cmd(client, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5003/", "api 5003")
run_cmd(client, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5004/", "api 5004")
run_cmd(client, f"ls -la {BACKEND_REMOTE}/utils/", "backend utils")
run_cmd(client, f"ls -la {BACKEND_REMOTE}/middleware/", "backend middleware")
run_cmd(client, f"ls -la {BACKEND_REMOTE}/routes/", "backend routes")
client.close()
safe_print("=== Done ===")

with open("deploy_v2_result.txt", "w", encoding="utf-8") as f:
    for line in log_lines:
        f.write(line + "\n")
