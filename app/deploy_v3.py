#!/usr/bin/env python3
import os, sys, paramiko, tarfile, io

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
FRONTEND_REMOTE = "/www/wwwroot/fire-platform"
BACKEND_REMOTE = "/opt/my-fire-api"
LOCAL_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
LOCAL_BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

def safe_print(s):
    try:
        print(s.encode('ascii', 'replace').decode('ascii'))
    except Exception:
        print(str(s))

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

def deploy():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    safe_print(f"Connecting to {HOST}...")
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()

    try:
        # ===== 1. Deploy Frontend =====
        safe_print("\n=== 1. Frontend Deployment ===")
        if not os.path.isdir(LOCAL_DIST):
            safe_print(f"ERROR: {LOCAL_DIST} not found")
            sys.exit(1)

        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            for root, dirs, files in os.walk(LOCAL_DIST):
                for f in files:
                    local_path = os.path.join(root, f)
                    arcname = os.path.relpath(local_path, LOCAL_DIST)
                    tar.add(local_path, arcname=arcname)
        buf.seek(0)
        tar_bytes = buf.read()
        safe_print(f"Packed dist ({len(tar_bytes)} bytes)")

        remote_tar = "/tmp/fire-platform-dist.tar.gz"
        with sftp.file(remote_tar, "wb") as f:
            f.write(tar_bytes)
        safe_print("Uploaded frontend archive")

        run_cmd(client, f"rm -rf {FRONTEND_REMOTE}/*", "clean frontend")
        run_cmd(client, f"tar -xzf {remote_tar} -C {FRONTEND_REMOTE}", "extract frontend")
        run_cmd(client, f"rm -f {remote_tar}", "remove tar")
        run_cmd(client, "nginx -t && nginx -s reload", "reload nginx")
        safe_print("Frontend deployed")

        # ===== 2. Deploy Backend =====
        safe_print("\n=== 2. Backend Deployment ===")
        run_cmd(client, f"mkdir -p {BACKEND_REMOTE}/middleware {BACKEND_REMOTE}/routes {BACKEND_REMOTE}/utils {BACKEND_REMOTE}/services", "create dirs")

        files_to_upload = [
            ('server.js', 'server.js'),
            ('fireHostApi.js', 'fireHostApi.js'),
            ('gb26875Server.js', 'gb26875Server.js'),
            ('fscn8001Server.js', 'fscn8001Server.js'),
            ('package.json', 'package.json'),
            ('middleware/auth.js', 'middleware/auth.js'),
            ('middleware/requestLog.js', 'middleware/requestLog.js'),
            ('routes/auth.js', 'routes/auth.js'),
            ('routes/dashboard.js', 'routes/dashboard.js'),
            ('routes/index.js', 'routes/index.js'),
            ('utils/db.js', 'utils/db.js'),
            ('utils/linkageEngine.js', 'utils/linkageEngine.js'),
            ('utils/response.js', 'utils/response.js'),
            ('utils/validation.js', 'utils/validation.js'),
            ('services/iotDevice.service.js', 'services/iotDevice.service.js'),
            ('services/alarm.service.js', 'services/alarm.service.js'),
        ]

        for local_rel, remote_rel in files_to_upload:
            local_path = os.path.join(LOCAL_BACKEND, local_rel)
            remote_path = f"{BACKEND_REMOTE}/{remote_rel}"
            if os.path.exists(local_path):
                sftp.put(local_path, remote_path)
                safe_print(f"  Uploaded {local_rel}")
            else:
                safe_print(f"  WARNING: {local_rel} not found")

        safe_print("\nInstalling dependencies...")
        run_cmd(client, f"cd {BACKEND_REMOTE} && npm install --production", "npm install")

        # ===== 3. Restart Services =====
        safe_print("\n=== 3. Restart Services ===")
        run_cmd(client, f"cd {BACKEND_REMOTE} && pm2 restart all 2>/dev/null || pm2 start server.js --name fire-api", "restart backend")

        # ===== 4. Run SQL =====
        safe_print("\n=== 4. Database Schema ===")
        local_sql = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sql", "fire_iot_device.sql")
        if os.path.exists(local_sql):
            remote_sql = "/tmp/fire_iot_device.sql"
            sftp.put(local_sql, remote_sql)
            run_cmd(client, f"/www/server/mysql/bin/mysql -uroot -S /tmp/mysql.sock fire_platform < {remote_sql} 2>&1 || mysql -uroot fire_platform < {remote_sql} 2>&1", "run sql")
            run_cmd(client, f"rm -f {remote_sql}", "cleanup sql")
        else:
            safe_print("  WARNING: sql/fire_iot_device.sql not found")

        # ===== 5. Verify =====
        import time
        time.sleep(3)
        safe_print("\n=== 5. Verification ===")
        run_cmd(client, "pm2 list", "pm2 status")
        run_cmd(client, "ss -tlnp | grep -E '5003|5004|5200|5201'", "ports")
        run_cmd(client, "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:5003/", "api 5003")
        run_cmd(client, f"ls -la {BACKEND_REMOTE}/services/", "backend services")

        safe_print("\n=== Deployment Complete ===")

    finally:
        sftp.close()
        client.close()

if __name__ == '__main__':
    deploy()
