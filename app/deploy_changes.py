#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Deploy device-unit relation changes to 124.223.35.58"""
import os
import sys
import paramiko
from scp import SCPClient

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"

def get_project_root():
    return os.path.dirname(os.path.abspath(__file__))

def progress(filename, size, sent):
    pct = float(sent) / float(size) * 100 if size else 0
    if pct >= 100 or int(pct) % 10 == 0:
        sys.stdout.write(f"\r  {filename}: {pct:.1f}%")
        sys.stdout.flush()

def deploy():
    root = get_project_root()
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"[1/5] Connecting to {HOST}...")
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)

    scp = SCPClient(ssh.get_transport(), progress=progress)

    # Frontend: upload dist/
    print("\n[2/5] Uploading frontend dist/...")
    dist_path = os.path.join(root, "dist")
    ssh.exec_command("rm -rf /www/wwwroot/fire-platform/assets /www/wwwroot/fire-platform/*.html /www/wwwroot/fire-platform/*.png 2>/dev/null")
    scp.put(dist_path, recursive=True, remote_path="/www/wwwroot/fire-platform/")
    print("  [OK] Frontend uploaded")

    # Backend files
    backend_files = [
        ("backend/routes/device.js", "/opt/my-fire-api/routes/device.js"),
        ("backend/routes/deviceAllocation.js", "/opt/my-fire-api/routes/deviceAllocation.js"),
        ("backend/routes/deviceAccess.js", "/opt/my-fire-api/routes/deviceAccess.js"),
        ("backend/routes/unit.js", "/opt/my-fire-api/routes/unit.js"),
        ("backend/utils/initDb.js", "/opt/my-fire-api/utils/initDb.js"),
    ]

    print("\n[3/5] Uploading backend files...")
    for local, remote in backend_files:
        local_path = os.path.join(root, local)
        remote_dir = os.path.dirname(remote)
        ssh.exec_command(f"mkdir -p {remote_dir}")
        scp.put(local_path, remote_path=remote)
        print(f"  [OK] {local} -> {remote}")

    # Restart PM2
    print("\n[4/5] Restarting PM2 fire-api...")
    stdin, stdout, stderr = ssh.exec_command("cd /opt/my-fire-api && pm2 restart fire-api --time")
    out = stdout.read().decode("utf-8", errors="ignore")
    err = stderr.read().decode("utf-8", errors="ignore")
    if err.strip():
        print(f"  [WARN] {err.strip()}")
    print(f"  {out.strip()}")

    # Verify status
    print("\n[5/5] Checking PM2 status...")
    stdin, stdout, stderr = ssh.exec_command("pm2 describe fire-api | grep -E 'status|pid|uptime'")
    out = stdout.read().decode("utf-8", errors="ignore")
    for line in out.strip().split("\n"):
        print(f"  {line.strip()}")

    # Check API health
    print("\n[Verify] Testing /api/health...")
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:5003/api/health || echo 'FAIL'")
    code = stdout.read().decode("utf-8", errors="ignore").strip()
    if code == "200":
        print(f"  [OK] API health check returned {code}")
    else:
        print(f"  [WARN] API health check returned {code}")

    scp.close()
    ssh.close()
    print("\n[Done] Deployment completed.")

if __name__ == "__main__":
    deploy()
