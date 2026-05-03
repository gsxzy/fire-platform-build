#!/usr/bin/env python3
"""Deploy frontend + backend to 124.223.35.58"""
import os
import sys
import paramiko
import tarfile
import io

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
FRONTEND_REMOTE = "/www/wwwroot/fire-platform"
BACKEND_REMOTE = "/opt/my-fire-api"
LOCAL_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
LOCAL_BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

def run_cmd(client, cmd, desc=""):
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', 'ignore').strip()
    err = stderr.read().decode('utf-8', 'ignore').strip()
    if desc:
        print(f"[{desc}] exit={exit_status}")
    if out:
        print(f"  OUT: {out[:500]}")
    if err:
        print(f"  ERR: {err[:500]}")
    return exit_status, out, err

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()

    try:
        # ===== 1. Deploy Frontend =====
        print("\n=== 1. Frontend Deployment ===")
        if not os.path.isdir(LOCAL_DIST):
            print(f"ERROR: {LOCAL_DIST} not found")
            sys.exit(1)

        # Pack dist
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            for root, dirs, files in os.walk(LOCAL_DIST):
                for f in files:
                    local_path = os.path.join(root, f)
                    arcname = os.path.relpath(local_path, LOCAL_DIST)
                    tar.add(local_path, arcname=arcname)
        buf.seek(0)
        tar_bytes = buf.read()
        print(f"Packed dist ({len(tar_bytes)} bytes)")

        # Upload & extract
        remote_tar = "/tmp/fire-platform-dist.tar.gz"
        with sftp.file(remote_tar, "wb") as f:
            f.write(tar_bytes)
        print("Uploaded frontend archive")

        run_cmd(client, f"rm -rf {FRONTEND_REMOTE}/*", "clean frontend")
        run_cmd(client, f"tar -xzf {remote_tar} -C {FRONTEND_REMOTE}", "extract frontend")
        run_cmd(client, f"rm -f {remote_tar}", "remove tar")
        run_cmd(client, "nginx -t && nginx -s reload", "reload nginx")
        print("Frontend deployed")

        # ===== 2. Deploy Backend =====
        print("\n=== 2. Backend Deployment ===")

        # Create directories on remote
        run_cmd(client, f"mkdir -p {BACKEND_REMOTE}/middleware {BACKEND_REMOTE}/routes {BACKEND_REMOTE}/utils", "create dirs")

        # Upload backend files
        files_to_upload = [
            # Root files
            ('server.js', 'server.js'),
            ('fireHostApi.js', 'fireHostApi.js'),
            ('gb26875Server.js', 'gb26875Server.js'),
            ('fscn8001Server.js', 'fscn8001Server.js'),
            ('package.json', 'package.json'),
            # middleware/
            ('middleware/auth.js', 'middleware/auth.js'),
            ('middleware/requestLog.js', 'middleware/requestLog.js'),
            # routes/
            ('routes/auth.js', 'routes/auth.js'),
            ('routes/dashboard.js', 'routes/dashboard.js'),
            ('routes/index.js', 'routes/index.js'),
            # utils/
            ('utils/db.js', 'utils/db.js'),
            ('utils/linkageEngine.js', 'utils/linkageEngine.js'),
            ('utils/response.js', 'utils/response.js'),
            ('utils/validation.js', 'utils/validation.js'),
        ]

        for local_rel, remote_rel in files_to_upload:
            local_path = os.path.join(LOCAL_BACKEND, local_rel)
            remote_path = f"{BACKEND_REMOTE}/{remote_rel}"
            if os.path.exists(local_path):
                sftp.put(local_path, remote_path)
                print(f"  Uploaded {local_rel}")
            else:
                print(f"  WARNING: {local_rel} not found")

        # Install dependencies
        print("\nInstalling dependencies...")
        run_cmd(client, f"cd {BACKEND_REMOTE} && npm install --production", "npm install")

        # ===== 3. Restart Services =====
        print("\n=== 3. Restart Services ===")
        run_cmd(client, f"cd {BACKEND_REMOTE} && pm2 restart all 2>/dev/null || pm2 start server.js --name fire-api", "restart backend")

        # Wait and verify
        import time
        time.sleep(3)

        print("\n=== 4. Verification ===")
        _, out, _ = run_cmd(client, "pm2 list", "pm2 status")
        _, out2, _ = run_cmd(client, "ss -tlnp | grep -E '5003|5004|5200|5201'", "ports listening")
        if out2:
            print(f"Listening ports:\n{out2}")
        else:
            print("WARNING: No expected ports listening")

        _, out3, _ = run_cmd(client, f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:5003/", "health check")
        if out3 == "200":
            print("HTTP API (5003) OK")
        else:
            print(f"HTTP API (5003) returned: {out3}")

        print("\n=== Deployment Complete ===")

    finally:
        sftp.close()
        client.close()

if __name__ == '__main__':
    deploy()
