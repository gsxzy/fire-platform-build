import paramiko
import os

HOST = "124.223.35.58"
USER = "root"
PASS = "Zhangcong2255"
REMOTE_API = "/opt/my-fire-api"
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = client.open_sftp()

try:
    print("[1/5] Uploading backend files...")
    sftp.put(os.path.join(LOCAL_DIR, "backend/routes/floorPlan.js"), f"{REMOTE_API}/routes/floorPlan.js")
    sftp.put(os.path.join(LOCAL_DIR, "sql/units_table.sql"), "/tmp/units_table.sql")
    print("  OK")

    print("\n[2/5] Uploading frontend dist...")
    import tarfile, io
    buf = io.BytesIO()
    dist_dir = os.path.join(LOCAL_DIR, "dist")
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for root, dirs, files in os.walk(dist_dir):
            for f in files:
                local_path = os.path.join(root, f)
                arcname = os.path.relpath(local_path, dist_dir)
                tar.add(local_path, arcname=arcname)
    buf.seek(0)
    tar_bytes = buf.read()
    remote_tar = "/tmp/fire-platform-dist.tar.gz"
    with sftp.file(remote_tar, "wb") as f:
        f.write(tar_bytes)
    cmds = [
        "rm -rf /www/wwwroot/fire-platform/*",
        "tar -xzf /tmp/fire-platform-dist.tar.gz -C /www/wwwroot/fire-platform",
        "rm -f /tmp/fire-platform-dist.tar.gz",
        "nginx -t && nginx -s reload",
    ]
    for cmd in cmds:
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        if err and 'syntax is ok' not in err and 'test is successful' not in err:
            print(f"  ERR: {err}")
        elif out:
            print(f"  {out}")
    print("  OK")

    print("\n[3/5] Running SQL: units_table.sql")
    stdin, stdout, stderr = client.exec_command(
        "mysql -u root -pZhangcong2255 fire_platform < /tmp/units_table.sql 2>&1"
    )
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out and 'Warning' not in out: print(f"  OUT: {out}")
    if err and 'Warning' not in err: print(f"  ERR: {err}")
    else: print("  OK")

    print("\n[4/5] Restarting PM2 fire-api...")
    stdin, stdout, stderr = client.exec_command("/www/server/nodejs/v20.20.0/bin/pm2 restart fire-api 2>&1")
    out = stdout.read().decode('utf-8', errors='replace').strip()
    safe = out.encode('ascii', 'replace').decode('ascii')
    print(f"  {safe[:300]}")

    print("\n[5/5] Verifying /api/units...")
    stdin, stdout, stderr = client.exec_command(
        "curl -s http://127.0.0.1:5003/api/units | head -c 200"
    )
    out = stdout.read().decode('utf-8', errors='replace').strip()
    print(f"  {out}")

    print("\nDeployment completed!")
finally:
    sftp.close()
    client.close()
